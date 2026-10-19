import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import config from '../../../assets/config/config.json';
import { FoldersService } from '../http/folders.service';
import { DocumentsService } from '../http/documents.service';
import { DashboardService } from '../http/dashboard.service';
import { BackupService } from '../http/backup.service';
import { ToastService } from '../utils/toast.service';
import { ConfirmService } from '../utils/confirm.service';
import { VistaPreviaService } from '../utils/vista-previa.service';
import { ArbolService } from '../utils/arbol.service';
import { AlmacenamientoLocalService, CLAVES_LOCALES } from '../utils/almacenamiento-local.service';
import { mensajeDeError } from '../utils/api-error';
import { FolderResponse } from '../interfaces/responses/FolderResponse';
import { DocumentResponse, DocumentType } from '../interfaces/responses/DocumentResponse';
import { DashboardResponse } from '../interfaces/responses/DashboardResponse';
import { DocumentRequest } from '../interfaces/requests/DocumentRequest';
import {
  Borrador, EstadoGuardado, FiltroPrioridad, ModalCarpeta, SesionGuardada, VistaCentral
} from '../interfaces/Notas';

interface CacheLocal {
  carpetas:   FolderResponse[];
  documentos: DocumentResponse[];
  resumen:    DashboardResponse | null;
}

const BORRADOR_NUEVO = 'nuevo';
const CARPETA_POR_DEFECTO = 'General';

/**
 * Estado de la app de notas. La API es la fuente de verdad; el front guarda una copia en localStorage
 * (abre al instante y sirve sin conexión) y los borradores del editor en cada tecla. Las fechas de
 * auditoría y las estadísticas vienen de la API; aquí solo se calculan vistas previas y ordenamientos.
 */
@Injectable({
  providedIn: 'root'
})
export class NotasStore {

  private readonly _foldersService = inject(FoldersService);
  private readonly _documentsService = inject(DocumentsService);
  private readonly _dashboardService = inject(DashboardService);
  private readonly _backupService = inject(BackupService);
  private readonly _toastService = inject(ToastService);
  private readonly _confirmService = inject(ConfirmService);
  private readonly _vistaPrevia = inject(VistaPreviaService);
  private readonly _arbolService = inject(ArbolService);
  private readonly _almacenamiento = inject(AlmacenamientoLocalService);

  readonly carpetas = signal<FolderResponse[]>([]);
  readonly documentos = signal<DocumentResponse[]>([]);
  readonly resumen = signal<DashboardResponse | null>(null);
  readonly vista = signal<VistaCentral>('inicio');
  readonly carpetaSeleccionadaId = signal<string | null>(null);
  readonly borrador = signal<Borrador | null>(null);
  // Cambia cada vez que se abre un documento: el editor vuelve a cargar su HTML
  readonly aperturaEditor = signal(0);
  readonly consulta = signal('');
  readonly filtroPrioridad = signal<FiltroPrioridad>('Todas');
  readonly expandidas = signal<Set<string>>(new Set(this._almacenamiento.leer<string[]>(CLAVES_LOCALES.expandidas, [])));
  readonly sidebarAbierto = signal(false);
  readonly modalCarpeta = signal<ModalCarpeta | null>(null);
  readonly cargando = signal(true);
  readonly publicando = signal(false);
  readonly sinConexion = signal(false);

  private vistaAntesDeBuscar: VistaCentral = 'inicio';
  private sesionRestaurada = false;
  private avisoAlmacenamientoLleno = false;

  readonly arbol = computed(() => this._arbolService.construir(this.carpetas(), this.documentos()));

  readonly carpetasPorId = computed(() => new Map(this.carpetas().map(c => [c.id, c])));

  readonly carpetaSeleccionada = computed(() => {
    const id = this.carpetaSeleccionadaId();
    return id ? this.carpetasPorId().get(id) ?? null : null;
  });

  readonly subcarpetasSeleccionada = computed(() => {
    const id = this.carpetaSeleccionadaId();
    return this.carpetas()
      .filter(c => c.parentFolderId === id)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  });

  readonly documentosCarpetaSinFiltro = computed(() => {
    const id = this.carpetaSeleccionadaId();
    return this._vistaPrevia.ordenarPorEdicion(this.documentos().filter(d => d.folderId === id));
  });

  // Vista de directorio: ordenados por última edición y filtrados por banderita
  readonly documentosCarpeta = computed(() => {
    const filtro = this.filtroPrioridad();
    const documentos = this.documentosCarpetaSinFiltro();
    return filtro === 'Todas' ? documentos : documentos.filter(d => d.priority === filtro);
  });

  readonly recientes = computed(() => this._vistaPrevia.ultimosEditados(this.documentos(), config.CantidadRecientes));

  readonly resultadosBusqueda = computed(() =>
    this._vistaPrevia.buscar(this.documentos(), this.consulta(), id => this.rutaDe(id)));

  readonly documentoActivo = computed(() => {
    const id = this.borrador()?.documentoId;
    return id ? this.documentos().find(d => d.id === id) ?? null : null;
  });

  readonly hayCambiosSinPublicar = computed(() => {
    const borrador = this.borrador();
    if (!borrador) return false;
    const publicado = this.documentoActivo();
    if (!publicado) return borrador.title.trim() !== '' || this._vistaPrevia.textoPlano(borrador.content) !== '';
    return publicado.title !== borrador.title || publicado.content !== borrador.content
      || publicado.priority !== borrador.priority || publicado.folderId !== borrador.folderId;
  });

  readonly estadoGuardado = computed<EstadoGuardado>(() => {
    if (this.publicando()) return 'publicando';
    if (this.sinConexion()) return 'sin-conexion';
    return this.hayCambiosSinPublicar() ? 'borrador' : 'sincronizado';
  });

  rutaDe(folderId: string): string[] {
    return this.carpetasPorId().get(folderId)?.path ?? [];
  }

  // ---------- Carga ----------

  async inicializar() {
    // 1) Copia local: la app se ve de inmediato aunque la API (Render gratis) tarde en despertar
    const cache = this._almacenamiento.leer<CacheLocal | null>(CLAVES_LOCALES.cache, null);
    if (cache) {
      this.carpetas.set(cache.carpetas ?? []);
      this.documentos.set(cache.documentos ?? []);
      this.resumen.set(cache.resumen ?? null);
      this.cargando.set(false);
      this.restaurarSesion();
    }

    // 2) Datos frescos de la API
    const ok = await this.cargarTodo();
    this.cargando.set(false);
    if (ok) this.restaurarSesion();
  }

  /** Recarga carpetas, documentos y estadísticas y actualiza la copia local. */
  async cargarTodo(): Promise<boolean> {
    const resp = await this.ejecutar(() => Promise.all([
      this._foldersService.obtenerCarpetas(),
      this._documentsService.obtenerDocumentos(),
      this._dashboardService.obtenerResumen()
    ]));
    if (!resp) return false;

    const [carpetas, documentos, resumen] = resp.valor;
    this.carpetas.set(carpetas);
    this.documentos.set(documentos);
    this.resumen.set(resumen);
    this.sinConexion.set(false);
    this.guardarCache();
    return true;
  }

  // ---------- Navegación ----------

  irAInicio() {
    this.limpiarBusquedaSinNavegar();
    this.vista.set('inicio');
    this.cerrarSidebarMovil();
    this.guardarSesion();
  }

  abrirCarpeta(id: string) {
    if (!this.carpetasPorId().has(id)) return;
    this.limpiarBusquedaSinNavegar();
    this.carpetaSeleccionadaId.set(id);
    this.filtroPrioridad.set('Todas');
    this.expandirRuta(id);
    this.vista.set('directorio');
    this.cerrarSidebarMovil();
    this.guardarSesion();
  }

  /** Explorar carpetas desde el inicio: abre la primera carpeta raíz (o pide crear una). */
  explorarCarpetas() {
    const primera = this.arbol()[0]?.carpeta;
    if (primera) {
      this.abrirCarpeta(primera.id);
    } else {
      this.abrirModalNuevaCarpeta(null);
    }
  }

  abrirDocumento(id: string) {
    const documento = this.documentos().find(d => d.id === id);
    if (!documento) {
      this._toastService.mostrar('El documento ya no existe', '⚠️');
      return;
    }

    this.limpiarBusquedaSinNavegar();
    const guardado = this.leerBorradores()[id];
    const vigente = guardado && guardado.baseUpdatedOn === documento.updatedOn;
    const borrador: Borrador = vigente ? guardado : this.borradorDesde(documento);
    if (guardado && !vigente) this.eliminarBorrador(id);

    this.mostrarEnEditor(borrador);
    if (vigente && this.hayCambiosSinPublicar()) {
      this._toastService.mostrar('Se restauró un borrador local sin publicar', '📝');
    }
  }

  /** Documento nuevo en la carpeta indicada, la seleccionada o la primera raíz (si no hay, crea "General"). */
  async nuevoDocumento(folderId?: string | null, tipo: DocumentType = 'Rich') {
    let destino = folderId ?? this.carpetaSeleccionadaId() ?? this.arbol()[0]?.carpeta.id ?? null;
    if (!destino) {
      const resp = await this.ejecutar(() =>
        this._foldersService.crearCarpeta({ name: CARPETA_POR_DEFECTO, parentFolderId: null }));
      if (!resp) return;
      await this.cargarTodo();
      destino = resp.valor.id;
    }

    this.limpiarBusquedaSinNavegar();
    const borrador: Borrador = {
      documentoId: null, folderId: destino, title: '', content: '', priority: 'None', type: tipo, baseUpdatedOn: null
    };
    this.mostrarEnEditor(borrador);
  }

  volverDesdeEditor() {
    const carpeta = this.borrador()?.folderId;
    this.borrador.set(null);
    if (carpeta && this.carpetasPorId().has(carpeta)) {
      this.abrirCarpeta(carpeta);
    } else {
      this.irAInicio();
    }
  }

  // ---------- Buscador global ----------

  buscar(texto: string) {
    if (texto.trim() && this.vista() !== 'busqueda') {
      this.vistaAntesDeBuscar = this.vista();
      this.vista.set('busqueda');
    }
    this.consulta.set(texto);
    if (!texto.trim() && this.vista() === 'busqueda') {
      this.vista.set(this.vistaAntesDeBuscar);
    }
  }

  cerrarBusqueda() {
    this.consulta.set('');
    if (this.vista() === 'busqueda') this.vista.set(this.vistaAntesDeBuscar);
  }

  // ---------- Árbol ----------

  alternarCarpeta(id: string) {
    this.expandidas.update(actual => {
      const nuevas = new Set(actual);
      if (nuevas.has(id)) nuevas.delete(id); else nuevas.add(id);
      return nuevas;
    });
    this.guardarExpandidas();
  }

  colapsarTodo() {
    this.expandidas.set(new Set());
    this.guardarExpandidas();
  }

  alternarSidebar() {
    this.sidebarAbierto.update(abierto => !abierto);
  }

  cerrarSidebarMovil() {
    this.sidebarAbierto.set(false);
  }

  // ---------- Editor ----------

  /** Cada cambio del editor se guarda de inmediato en localStorage como borrador. */
  actualizarBorrador(cambios: Partial<Pick<Borrador, 'title' | 'content' | 'priority' | 'folderId'>>) {
    const actual = this.borrador();
    if (!actual) return;

    const borrador = { ...actual, ...cambios };
    this.borrador.set(borrador);
    const borradores = this.leerBorradores();
    borradores[borrador.documentoId ?? BORRADOR_NUEVO] = borrador;
    this.escribirLocal(CLAVES_LOCALES.borradores, borradores);
  }

  async publicar(): Promise<boolean> {
    const borrador = this.borrador();
    if (!borrador || this.publicando()) return false;

    const request: DocumentRequest = {
      folderId: borrador.folderId,
      title: borrador.title.trim(),
      content: borrador.content,
      priority: borrador.priority,
      type: borrador.type ?? 'Rich'
    };

    this.publicando.set(true);
    const resp = await this.ejecutar(() => borrador.documentoId
      ? this._documentsService.actualizarDocumento(borrador.documentoId, request)
      : this._documentsService.crearDocumento(request));
    this.publicando.set(false);
    if (!resp) return false;

    this.eliminarBorrador(borrador.documentoId ?? BORRADOR_NUEVO);
    this.borrador.set(null);
    await this.cargarTodo();

    // Tras publicar se muestra el directorio de la carpeta, con el documento primero
    this.abrirCarpeta(borrador.folderId);
    this._toastService.mostrar(borrador.documentoId ? 'Documento publicado' : 'Documento creado y publicado', '✓');
    return true;
  }

  async descartarCambios() {
    const borrador = this.borrador();
    if (!borrador) return;

    const respuesta = await this._confirmService.preguntar({
      titulo: 'Descartar cambios',
      mensaje: 'Se perderán los cambios locales que no publicaste.',
      opciones: [
        { etiqueta: 'Cancelar', valor: 'no', estilo: 'secundario' },
        { etiqueta: 'Descartar', valor: 'si', estilo: 'peligro' }
      ]
    });
    if (respuesta !== 'si') return;

    this.eliminarBorrador(borrador.documentoId ?? BORRADOR_NUEVO);
    const publicado = this.documentoActivo();
    if (publicado) {
      this.mostrarEnEditor(this.borradorDesde(publicado));
    } else {
      this.volverDesdeEditor();
    }
  }

  async eliminarDocumento(documento: DocumentResponse) {
    const respuesta = await this._confirmService.preguntar({
      titulo: '¿Eliminar este documento?',
      mensaje: `Se eliminará "${documento.title}" de forma permanente.\nEsta acción no se puede deshacer.`,
      opciones: [
        { etiqueta: 'Cancelar', valor: 'no', estilo: 'secundario' },
        { etiqueta: 'Sí, eliminar', valor: 'si', estilo: 'peligro' }
      ]
    });
    if (respuesta !== 'si') return;

    const resp = await this.ejecutar(() => this._documentsService.eliminarDocumento(documento.id));
    if (!resp) return;

    this.eliminarBorrador(documento.id);
    const estabaAbierto = this.borrador()?.documentoId === documento.id;
    await this.cargarTodo();
    if (estabaAbierto) {
      this.borrador.set(null);
      this.abrirCarpeta(documento.folderId);
    }
    this._toastService.mostrar('Documento eliminado', '🗑️');
  }

  // ---------- Carpetas ----------

  abrirModalNuevaCarpeta(padreId: string | null) {
    this.modalCarpeta.set({ modo: 'crear', carpeta: null, padreId });
  }

  abrirModalEditarCarpeta(carpeta: FolderResponse) {
    this.modalCarpeta.set({ modo: 'editar', carpeta, padreId: carpeta.parentFolderId });
  }

  cerrarModalCarpeta() {
    this.modalCarpeta.set(null);
  }

  async guardarCarpeta(nombre: string, padreId: string | null): Promise<boolean> {
    const modal = this.modalCarpeta();
    if (!modal) return false;

    const request = { name: nombre.trim(), parentFolderId: padreId };
    const editada = modal.carpeta;
    const resp = await this.ejecutar(() => editada
      ? this._foldersService.actualizarCarpeta(editada.id, request).then(() => ({ id: editada.id }))
      : this._foldersService.crearCarpeta(request));
    if (!resp) return false;

    this.cerrarModalCarpeta();
    await this.cargarTodo();
    if (padreId) this.expandirRuta(padreId);
    this.abrirCarpeta(resp.valor.id);
    this._toastService.mostrar(editada ? 'Carpeta actualizada' : 'Carpeta creada', '📁');
    return true;
  }

  async eliminarCarpeta(carpeta: FolderResponse) {
    const subarbol = this._arbolService.subarbol(this.carpetas(), carpeta.id);
    const idsDocumentos = this.documentos().filter(d => subarbol.has(d.folderId)).map(d => d.id);
    const contenido = [
      subarbol.size > 1 ? `${subarbol.size - 1} subcarpeta(s)` : '',
      idsDocumentos.length > 0 ? `${idsDocumentos.length} documento(s)` : ''
    ].filter(Boolean).join(' y ');

    const respuesta = await this._confirmService.preguntar({
      titulo: `¿Eliminar la carpeta "${carpeta.name}"?`,
      mensaje: (contenido
        ? `Se eliminarán de forma permanente la carpeta y todo su contenido: ${contenido}.`
        : 'Se eliminará la carpeta de forma permanente (está vacía).') + '\nEsta acción no se puede deshacer.',
      opciones: [
        { etiqueta: 'Cancelar', valor: 'no', estilo: 'secundario' },
        { etiqueta: 'Sí, eliminar carpeta', valor: 'si', estilo: 'peligro' }
      ]
    });
    if (respuesta !== 'si') return;

    const resp = await this.ejecutar(() => this._foldersService.eliminarCarpeta(carpeta.id));
    if (!resp) return;

    // Los borradores locales de documentos que ya no existen tampoco sirven
    idsDocumentos.forEach(id => this.eliminarBorrador(id));
    await this.cargarTodo();
    const seleccionada = this.carpetaSeleccionadaId();
    const borradorEnCarpeta = this.borrador() && subarbol.has(this.borrador()!.folderId);
    if ((seleccionada && subarbol.has(seleccionada)) || borradorEnCarpeta) {
      this.borrador.set(null);
      this.carpetaSeleccionadaId.set(null);
      this.irAInicio();
    }
    this._toastService.mostrar('Carpeta eliminada', '🗑️');
  }

  // ---------- Respaldos ----------

  async exportarRespaldo() {
    const resp = await this.ejecutar(() => this._backupService.exportarRespaldo());
    if (!resp) return;

    const blob = new Blob([JSON.stringify(resp.valor, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `notas_personales_respaldo_${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
    this._toastService.mostrar('Respaldo descargado', '💾');
  }

  async importarRespaldo(archivo: File) {
    let respaldo: unknown;
    try {
      respaldo = JSON.parse(await archivo.text());
    } catch {
      this._toastService.mostrar('El archivo no es un JSON válido', '⚠️');
      return;
    }

    const respuesta = await this._confirmService.preguntar({
      titulo: 'Importar respaldo',
      mensaje: `Se reemplazarán todas las carpetas y documentos por los de "${archivo.name}".\nLos borradores sin publicar se descartan.`,
      opciones: [
        { etiqueta: 'Cancelar', valor: 'no', estilo: 'secundario' },
        { etiqueta: 'Importar y reemplazar', valor: 'si', estilo: 'peligro' }
      ]
    });
    if (respuesta !== 'si') return;

    const resp = await this.ejecutar(() => this._backupService.importarRespaldo(respaldo));
    if (!resp) return;

    // La recarga vuelve a poblar la copia local con los datos importados
    this._almacenamiento.eliminar(CLAVES_LOCALES.borradores);
    this.borrador.set(null);
    this.carpetaSeleccionadaId.set(null);
    await this.cargarTodo();
    this.irAInicio();
    this._toastService.mostrar(
      `Respaldo importado: ${resp.valor.folders} carpeta(s) y ${resp.valor.documents} documento(s)`, '🚀');
  }

  // ---------- Privados ----------

  private mostrarEnEditor(borrador: Borrador) {
    this.borrador.set(borrador);
    this.carpetaSeleccionadaId.set(borrador.folderId);
    this.expandirRuta(borrador.folderId);
    this.vista.set('editor');
    this.aperturaEditor.update(n => n + 1);
    this.cerrarSidebarMovil();
    this.guardarSesion();
  }

  private borradorDesde(documento: DocumentResponse): Borrador {
    return {
      documentoId: documento.id,
      folderId: documento.folderId,
      title: documento.title,
      content: documento.content,
      priority: documento.priority,
      type: documento.type ?? 'Rich',
      baseUpdatedOn: documento.updatedOn
    };
  }

  private limpiarBusquedaSinNavegar() {
    this.consulta.set('');
  }

  /** Despliega en el árbol todas las carpetas hasta la indicada. */
  private expandirRuta(id: string) {
    const porId = this.carpetasPorId();
    const nuevas = new Set(this.expandidas());
    let actual = porId.get(id);
    while (actual && !nuevas.has(actual.id)) {
      nuevas.add(actual.id);
      actual = actual.parentFolderId ? porId.get(actual.parentFolderId) : undefined;
    }
    if (nuevas.size !== this.expandidas().size) {
      this.expandidas.set(nuevas);
      this.guardarExpandidas();
    }
  }

  // Solo una vez (con la copia local o, si no hay, con los datos de la API) para no pisar la navegación
  private restaurarSesion() {
    if (this.sesionRestaurada) return;
    this.sesionRestaurada = true;
    const sesion = this._almacenamiento.leer<SesionGuardada | null>(CLAVES_LOCALES.sesion, null);
    if (!sesion) return;

    if (sesion.vista === 'editor') {
      const nuevo = this.leerBorradores()[BORRADOR_NUEVO];
      if (sesion.documentoId && this.documentos().some(d => d.id === sesion.documentoId)) {
        this.abrirDocumento(sesion.documentoId);
        return;
      }
      if (!sesion.documentoId && nuevo && this.carpetasPorId().has(nuevo.folderId)) {
        this.mostrarEnEditor(nuevo);
        return;
      }
    }
    if ((sesion.vista === 'directorio' || sesion.vista === 'editor') && sesion.carpetaId
      && this.carpetasPorId().has(sesion.carpetaId)) {
      this.abrirCarpeta(sesion.carpetaId);
      return;
    }
    this.vista.set('inicio');
  }

  private guardarSesion() {
    const vista = this.vista();
    const sesion: SesionGuardada = {
      vista: vista === 'busqueda' ? this.vistaAntesDeBuscar : vista,
      carpetaId: this.carpetaSeleccionadaId(),
      documentoId: vista === 'editor' ? this.borrador()?.documentoId ?? null : null
    };
    this._almacenamiento.escribir(CLAVES_LOCALES.sesion, sesion);
  }

  private guardarExpandidas() {
    this._almacenamiento.escribir(CLAVES_LOCALES.expandidas, [...this.expandidas()]);
  }

  private guardarCache() {
    // Los documentos muy pesados (páginas HTML con datos, imágenes) no caben en localStorage: se omiten de la
    // copia local y llegan igual desde la API. Nunca se guardan vacíos, para no publicar un contenido perdido
    const documentos = this.documentos().filter(d => d.content.length <= config.LargoMaximoDocumentoEnCache);
    const cache: CacheLocal = { carpetas: this.carpetas(), documentos, resumen: this.resumen() };
    this.escribirLocal(CLAVES_LOCALES.cache, cache);
  }

  private leerBorradores(): Record<string, Borrador> {
    return this._almacenamiento.leer<Record<string, Borrador>>(CLAVES_LOCALES.borradores, {});
  }

  private eliminarBorrador(clave: string) {
    const borradores = this.leerBorradores();
    if (!(clave in borradores)) return;
    delete borradores[clave];
    this.escribirLocal(CLAVES_LOCALES.borradores, borradores);
  }

  private escribirLocal(clave: string, valor: unknown) {
    if (this._almacenamiento.escribir(clave, valor) || this.avisoAlmacenamientoLleno) return;
    // Se avisa una sola vez: las imágenes en Base64 pueden llenar los ~5 MB de localStorage
    this.avisoAlmacenamientoLleno = true;
    this._toastService.mostrar('El almacenamiento local está lleno: publica para no perder cambios', '⚠️');
  }

  // Devuelve { valor } si la llamada fue exitosa; si no, muestra el error de la API y devuelve null
  private async ejecutar<T>(accion: () => Promise<T>): Promise<{ valor: T } | null> {
    try {
      return { valor: await accion() };
    } catch (error) {
      const sinApi = error instanceof HttpErrorResponse && (error.status === 0 || error.status === 503);
      if (sinApi) this.sinConexion.set(true);
      this._toastService.mostrar(mensajeDeError(error), '⚠️');
      this.cargando.set(false);
      return null;
    }
  }
}
