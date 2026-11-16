import {
  ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, SecurityContext, untracked, ViewChild
} from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import config from '../../../../../assets/config/config.json';
import { NotasStore } from '../../../../core/state/notas.store';
import { AsistenteStore } from '../../../../core/state/asistente.store';
import { ToastService } from '../../../../core/utils/toast.service';
import { ConfirmService } from '../../../../core/utils/confirm.service';
import { leerImagenComoBase64 } from '../../../../core/utils/imagenes';
import { ORDEN_PRIORIDADES, PRIORIDADES } from '../../../../core/utils/prioridades';
import { Priority } from '../../../../core/interfaces/responses/DocumentResponse';
import { FechaRelativaPipe } from '../../../../core/pipes/fecha-relativa.pipe';
import { IconoComponent } from '../../../../shared/icono/icono.component';
import { NombreIcono } from '../../../../shared/icono/iconos';
import { EditorHtmlComponent } from '../editor-html/editor-html.component';
import { EditorMarkdownComponent } from '../editor-markdown/editor-markdown.component';

interface HerramientaTexto {
  titulo:     string;
  comando:    string;
  valor?:     string;
  icono?:     NombreIcono;
  texto?:     string;
  separador?: boolean;
}

const HERRAMIENTAS_TEXTO: HerramientaTexto[] = [
  { titulo: 'Negrita (Ctrl+B)', comando: 'bold', icono: 'bold' },
  { titulo: 'Cursiva (Ctrl+I)', comando: 'italic', icono: 'italic' },
  { titulo: 'Subrayado (Ctrl+U)', comando: 'underline', icono: 'underline', separador: true },
  { titulo: 'Título', comando: 'formatBlock', valor: '<h2>', texto: 'H2' },
  { titulo: 'Subtítulo', comando: 'formatBlock', valor: '<h3>', texto: 'H3' },
  { titulo: 'Texto normal', comando: 'formatBlock', valor: '<p>', texto: 'Normal', separador: true },
  { titulo: 'Lista con viñetas', comando: 'insertUnorderedList', icono: 'list' },
  { titulo: 'Lista numerada', comando: 'insertOrderedList', icono: 'list-ordered' },
  { titulo: 'Cita', comando: 'formatBlock', valor: '<blockquote>', icono: 'quote', separador: true }
];

const TABLA_INICIAL =
  '<div class="tabla-desplazable"><table><thead><tr><th>Columna 1</th><th>Columna 2</th><th>Columna 3</th></tr></thead>' +
  '<tbody><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table></div><p><br></p>';

// Distancia al borde derecho de una celda (px) en la que se puede tomar para cambiar el ancho
const ZONA_BORDE_PX = 6;
const ANCHO_MINIMO_COLUMNA = 48;

/**
 * Hoja de edición estilo Confluence sobre un div contenteditable. Cada cambio se guarda al instante como
 * borrador local (NotasStore.actualizarBorrador); "Publicar" lo envía a la API.
 */
@Component({
  selector: 'app-editor-documento',
  standalone: true,
  imports: [LowerCasePipe, FechaRelativaPipe, IconoComponent, EditorHtmlComponent, EditorMarkdownComponent],
  templateUrl: './editor-documento.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' }
})
export class EditorDocumentoComponent {

  protected readonly store = inject(NotasStore);
  private readonly _asistente = inject(AsistenteStore);
  private readonly _toastService = inject(ToastService);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _confirmService = inject(ConfirmService);

  protected readonly prioridades = PRIORIDADES;
  protected readonly ordenPrioridades = ORDEN_PRIORIDADES;
  protected readonly herramientasTexto = HERRAMIENTAS_TEXTO;

  protected menuPrioridadAbierto = false;
  protected arrastrando = false;

  private cuerpoRef?: ElementRef<HTMLDivElement>;
  private rangoGuardado: Range | null = null;
  private ajustandoColumna = false;

  protected readonly carpetasOrdenadas = computed(() =>
    [...this.store.carpetas()].sort((a, b) => a.path.join('/').localeCompare(b.path.join('/'), 'es')));

  // El div editable aparece junto con el borrador: al crearse se carga su contenido
  @ViewChild('cuerpo') set cuerpo(ref: ElementRef<HTMLDivElement> | undefined) {
    const nuevo = ref !== undefined && ref.nativeElement !== this.cuerpoRef?.nativeElement;
    this.cuerpoRef = ref;
    if (nuevo) this.cargarContenido();
  }

  constructor() {
    // Abrir otro documento sin salir del editor: se reemplaza el HTML de la hoja
    effect(() => {
      this.store.aperturaEditor();
      untracked(() => this.cargarContenido());
    });
  }

  // ---------- Campos ----------

  protected cambiarTitulo(event: Event) {
    this.store.actualizarBorrador({ title: (event.target as HTMLInputElement).value });
  }

  protected cambiarPrioridad(prioridad: Priority) {
    this.menuPrioridadAbierto = false;
    this.store.actualizarBorrador({ priority: prioridad });
  }

  protected moverA(event: Event) {
    this.store.actualizarBorrador({ folderId: (event.target as HTMLSelectElement).value });
  }

  protected enfocarCuerpo(event: Event) {
    event.preventDefault();
    this.cuerpoRef?.nativeElement.focus();
  }

  protected preguntarIa() {
    const borrador = this.store.borrador();
    if (borrador) this._asistente.preguntarSobreDocumento(borrador);
  }

  // ---------- Contenido ----------

  protected alEscribir() {
    const cuerpo = this.cuerpoRef?.nativeElement;
    if (cuerpo) this.store.actualizarBorrador({ content: cuerpo.innerHTML });
  }

  protected alPresionarTecla(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.store.publicar();
      return;
    }
    // Dentro de un bloque de código, Tab indenta en vez de salir del editor
    if (event.key === 'Tab' && this.elementoEnCursor()?.closest('pre')) {
      event.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  }

  protected comando(comando: string, valor?: string) {
    this.prepararSeleccion();
    document.execCommand(comando, false, valor);
    this.alEscribir();
  }

  protected insertarTabla() {
    const insertados = this.insertarBloque(TABLA_INICIAL);
    const primeraCelda = insertados[0]?.querySelector('td');
    if (primeraCelda) this.ubicarCursorEn(primeraCelda, false);
  }

  protected agregarFila() {
    const celda = this.celdaEnCursor();
    if (!celda) return;

    const fila = celda.parentElement as HTMLTableRowElement;
    const tabla = celda.closest('table') as HTMLTableElement;
    const nueva = document.createElement('tr');
    for (let i = 0; i < fila.cells.length; i++) {
      const td = document.createElement('td');
      td.innerHTML = '<br>';
      nueva.appendChild(td);
    }

    // Desde el encabezado, la fila nueva va al inicio del cuerpo de la tabla
    if (fila.parentElement?.tagName === 'THEAD') {
      const cuerpoTabla = tabla.tBodies[0] ?? tabla.createTBody();
      cuerpoTabla.insertBefore(nueva, cuerpoTabla.firstChild);
    } else {
      fila.after(nueva);
    }
    this.alEscribir();
  }

  protected agregarColumna() {
    const celda = this.celdaEnCursor();
    if (!celda) return;

    const indice = celda.cellIndex;
    const tabla = celda.closest('table') as HTMLTableElement;
    for (const fila of Array.from(tabla.rows)) {
      const enEncabezado = fila.parentElement?.tagName === 'THEAD';
      const nueva = document.createElement(enEncabezado ? 'th' : 'td');
      nueva.innerHTML = enEncabezado ? 'Nueva columna' : '<br>';
      const referencia = fila.cells[indice];
      if (referencia) referencia.after(nueva); else fila.appendChild(nueva);
    }
    this.alEscribir();
  }

  protected quitarFila() {
    const celda = this.celdaEnCursor();
    if (!celda) return;

    const fila = celda.parentElement as HTMLTableRowElement;
    const tabla = celda.closest('table') as HTMLTableElement;
    // El cursor pasa a la fila de abajo (o a la de arriba si era la última)
    const vecina = (fila.nextElementSibling ?? fila.previousElementSibling) as HTMLTableRowElement | null;
    fila.remove();

    if (tabla.rows.length === 0) {
      this.eliminarTablaDelDocumento(tabla);
      return;
    }
    this.ubicarCursorEnCelda(vecina?.cells[Math.min(celda.cellIndex, vecina.cells.length - 1)] ?? tabla.rows[0].cells[0]);
    this.alEscribir();
  }

  protected quitarColumna() {
    const celda = this.celdaEnCursor();
    if (!celda) return;

    const indice = celda.cellIndex;
    const tabla = celda.closest('table') as HTMLTableElement;
    // La fila se toma antes de quitar la celda: una vez quitada, celda.parentElement es null
    const filaDelCursor = celda.parentElement as HTMLTableRowElement;
    for (const fila of Array.from(tabla.rows)) {
      fila.cells[indice]?.remove();
    }

    if (Array.from(tabla.rows).every(fila => fila.cells.length === 0)) {
      this.eliminarTablaDelDocumento(tabla);
      return;
    }
    const destino = filaDelCursor.cells[Math.min(indice, filaDelCursor.cells.length - 1)] ?? tabla.rows[0].cells[0];
    this.ubicarCursorEnCelda(destino);
    this.alEscribir();
  }

  protected async quitarTabla() {
    const celda = this.celdaEnCursor();
    if (!celda) return;
    const tabla = celda.closest('table') as HTMLTableElement;

    const respuesta = await this._confirmService.preguntar({
      titulo: '¿Eliminar la tabla?',
      mensaje: `Se quitará la tabla completa (${tabla.rows.length} fila(s)) del documento. Si no publicaste, puedes recuperarla con "Descartar cambios".`,
      opciones: [
        { etiqueta: 'Cancelar', valor: 'no', estilo: 'secundario' },
        { etiqueta: 'Eliminar tabla', valor: 'si', estilo: 'peligro' }
      ]
    });
    if (respuesta === 'si') this.eliminarTablaDelDocumento(tabla);
  }

  // ---------- Ancho de columnas (arrastrar el borde derecho de una celda) ----------

  /** Muestra el cursor de redimensionar al pasar sobre el borde derecho de una celda. */
  protected alMoverSobreHoja(event: PointerEvent) {
    const cuerpo = this.cuerpoRef?.nativeElement;
    if (!cuerpo || this.ajustandoColumna) return;
    cuerpo.style.cursor = this.bordeDeColumna(event) ? 'col-resize' : '';
  }

  /**
   * Al presionar sobre el borde se arrastra el ancho de la columna. Los anchos se guardan en el atributo width
   * de las celdas de la primera fila: el saneamiento de Angular conserva width, pero quita los style.
   */
  protected alPresionarSobreHoja(event: PointerEvent) {
    const celda = this.bordeDeColumna(event);
    if (!celda || event.button !== 0) return;
    event.preventDefault();

    const tabla = celda.closest('table') as HTMLTableElement;
    const encabezado = Array.from(tabla.rows[0].cells);
    // Al primer ajuste se fijan los anchos actuales de todas las columnas, para que solo cambie la arrastrada
    encabezado.forEach(c => c.setAttribute('width', String(Math.round(c.getBoundingClientRect().width))));
    tabla.classList.add('tabla-ajustada');

    const columna = encabezado[Math.min(celda.cellIndex, encabezado.length - 1)];
    const inicioX = event.clientX;
    const anchoInicial = columna.getBoundingClientRect().width;
    this.ajustandoColumna = true;
    document.body.style.cursor = 'col-resize';

    const mover = (e: PointerEvent) => {
      const ancho = Math.max(ANCHO_MINIMO_COLUMNA, Math.round(anchoInicial + e.clientX - inicioX));
      columna.setAttribute('width', String(ancho));
    };
    const soltar = () => {
      document.removeEventListener('pointermove', mover);
      document.removeEventListener('pointerup', soltar);
      document.body.style.cursor = '';
      this.ajustandoColumna = false;
      this.alEscribir();
    };
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
  }

  protected insertarCodigo() {
    const seleccionado = window.getSelection()?.toString() ?? '';
    const codigo = this.escapar(seleccionado) || '// Escribe tu código aquí';
    if (seleccionado) document.execCommand('delete');
    // Solo <pre>: al escribir sobre un <code> seleccionado, Chrome lo cambia por un <span> con estilos
    const insertados = this.insertarBloque(`<pre>${codigo}</pre><p><br></p>`);
    const bloqueCodigo = insertados[0];
    // Sin selección previa, el texto de ejemplo queda seleccionado para escribir encima
    if (bloqueCodigo) this.ubicarCursorEn(bloqueCodigo, !seleccionado);
  }

  // ---------- Imágenes (Base64) ----------

  protected guardarSeleccion() {
    const seleccion = window.getSelection();
    const cuerpo = this.cuerpoRef?.nativeElement;
    if (cuerpo && seleccion && seleccion.rangeCount > 0 && cuerpo.contains(seleccion.getRangeAt(0).commonAncestorContainer)) {
      this.rangoGuardado = seleccion.getRangeAt(0).cloneRange();
    }
  }

  protected async adjuntarDesdeSelector(input: HTMLInputElement) {
    const archivos = Array.from(input.files ?? []);
    input.value = '';
    await this.adjuntarImagenes(archivos);
  }

  protected alArrastrar(event: DragEvent) {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.arrastrando = true;
  }

  protected async alSoltar(event: DragEvent) {
    this.arrastrando = false;
    const archivos = Array.from(event.dataTransfer?.files ?? []);
    if (archivos.length === 0) return;
    event.preventDefault();

    // La imagen queda donde se soltó (si el navegador lo informa)
    const rango = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    if (rango && this.cuerpoRef?.nativeElement.contains(rango.startContainer)) this.rangoGuardado = rango;
    await this.adjuntarImagenes(archivos);
  }

  protected async alPegar(event: ClipboardEvent) {
    const imagenes = Array.from(event.clipboardData?.files ?? []).filter(a => a.type.startsWith('image/'));
    if (imagenes.length === 0) return;
    event.preventDefault();
    this.guardarSeleccion();
    await this.adjuntarImagenes(imagenes);
  }

  private async adjuntarImagenes(archivos: File[]) {
    for (const archivo of archivos) {
      try {
        const base64 = await leerImagenComoBase64(archivo, config.TamanoMaximoImagenMb);
        const imagen = `<img src="${base64}" alt="${this.escapar(archivo.name)}">`;
        // Dentro de un bloque de código la imagen va en un párrafo propio, a continuación
        if (this.cursorEnCodigo()) {
          this.insertarBloque(`<p>${imagen}</p>`);
        } else {
          this.insertarHtml(`${imagen}<br>`);
        }
      } catch (error) {
        this._toastService.mostrar((error as Error).message, '⚠️');
      }
    }
  }

  // ---------- Privados ----------

  private cargarContenido() {
    const cuerpo = this.cuerpoRef?.nativeElement;
    const borrador = this.store.borrador();
    if (!cuerpo || !borrador) return;

    // Enter crea párrafos <p> (no <div>), igual que el resto del contenido
    document.execCommand('defaultParagraphSeparator', false, 'p');

    // El HTML puede venir de un respaldo importado: se sanitiza antes de volver a mostrarlo
    cuerpo.innerHTML = this._sanitizer.sanitize(SecurityContext.HTML, borrador.content) ?? '';

    // Si termina en una tabla o un bloque de código, un párrafo final permite seguir escribiendo debajo
    const ultimo = cuerpo.lastElementChild;
    if (ultimo && ultimo.matches('table, pre, .tabla-desplazable')) {
      cuerpo.insertAdjacentHTML('beforeend', '<p><br></p>');
    }
    this.rangoGuardado = null;
    this.menuPrioridadAbierto = false;
  }

  // Contenido en línea (imágenes) en la posición del cursor
  private insertarHtml(html: string) {
    this.prepararSeleccion();
    document.execCommand('insertHTML', false, html);
    this.rangoGuardado = null;
    this.alEscribir();
  }

  /**
   * Bloques (tablas, código) a continuación del párrafo donde está el cursor. No usa insertHTML porque
   * Chrome convierte un bloque insertado dentro de un párrafo en un <span> con estilos en línea.
   * Un párrafo vacío se reemplaza. Devuelve los elementos insertados.
   */
  private insertarBloque(html: string): HTMLElement[] {
    const cuerpo = this.cuerpoRef?.nativeElement;
    if (!cuerpo) return [];
    this.prepararSeleccion();

    const plantilla = document.createElement('template');
    plantilla.innerHTML = html;
    const nodos = Array.from(plantilla.content.childNodes);

    const rango = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null;
    let bloque: Node | null = rango?.startContainer ?? null;
    if (bloque === cuerpo) {
      bloque = cuerpo.childNodes[Math.max(0, (rango?.startOffset ?? 0) - 1)] ?? null;
    }
    while (bloque && bloque.parentNode !== cuerpo) bloque = bloque.parentNode;

    const vacio = bloque instanceof HTMLElement && !bloque.textContent?.trim() && !bloque.querySelector('img, table, pre');
    if (bloque && vacio) {
      (bloque as HTMLElement).replaceWith(...nodos);
    } else if (bloque) {
      (bloque as ChildNode).after(...nodos);
    } else {
      cuerpo.append(...nodos);
    }

    this.rangoGuardado = null;
    this.alEscribir();
    return nodos.filter((n): n is HTMLElement => n instanceof HTMLElement);
  }

  private ubicarCursorEn(elemento: HTMLElement, seleccionarContenido: boolean) {
    const rango = document.createRange();
    rango.selectNodeContents(elemento);
    if (!seleccionarContenido) rango.collapse(true);
    const seleccion = window.getSelection();
    seleccion?.removeAllRanges();
    seleccion?.addRange(rango);
  }

  /** Enfoca la hoja y deja el cursor en la última posición conocida (o al final). */
  private prepararSeleccion() {
    const cuerpo = this.cuerpoRef?.nativeElement;
    if (!cuerpo) return;
    cuerpo.focus();

    const seleccion = window.getSelection();
    if (!seleccion) return;
    const dentro = seleccion.rangeCount > 0 && cuerpo.contains(seleccion.getRangeAt(0).commonAncestorContainer);
    if (dentro && !this.rangoGuardado) return;

    let rango = this.rangoGuardado;
    if (!rango) {
      rango = document.createRange();
      rango.selectNodeContents(cuerpo);
      rango.collapse(false);
    }
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
  }

  private elementoEnCursor(): Element | null {
    const nodo = window.getSelection()?.anchorNode;
    const elemento = nodo instanceof Element ? nodo : nodo?.parentElement ?? null;
    return elemento && this.cuerpoRef?.nativeElement.contains(elemento) ? elemento : null;
  }

  private cursorEnCodigo(): boolean {
    const nodo = this.rangoGuardado?.startContainer ?? window.getSelection()?.anchorNode ?? null;
    const elemento = nodo instanceof Element ? nodo : nodo?.parentElement ?? null;
    return !!elemento?.closest('pre') && !!this.cuerpoRef?.nativeElement.contains(elemento);
  }

  private celdaEnCursor(): HTMLTableCellElement | null {
    const celda = this.elementoEnCursor()?.closest('td, th') as HTMLTableCellElement | null;
    if (!celda) this._toastService.mostrar('Ubica el cursor dentro de una tabla', 'ℹ');
    return celda;
  }

  /** La celda cuyo borde derecho está bajo el puntero (o la anterior, si el puntero está en el borde izquierdo). */
  private bordeDeColumna(event: PointerEvent): HTMLTableCellElement | null {
    const objetivo = event.target instanceof Element ? event.target : null;
    const celda = objetivo?.closest('td, th') as HTMLTableCellElement | null;
    if (!celda || !this.cuerpoRef?.nativeElement.contains(celda)) return null;

    const caja = celda.getBoundingClientRect();
    if (caja.right - event.clientX <= ZONA_BORDE_PX) return celda;
    const fila = celda.parentElement as HTMLTableRowElement;
    if (event.clientX - caja.left <= ZONA_BORDE_PX && celda.cellIndex > 0) return fila.cells[celda.cellIndex - 1];
    return null;
  }

  /** Quita la tabla (con su contenedor desplazable) y deja el cursor en un párrafo en su lugar. */
  private eliminarTablaDelDocumento(tabla: HTMLTableElement) {
    const bloque = (tabla.parentElement?.classList.contains('tabla-desplazable') ? tabla.parentElement : tabla) as HTMLElement;
    // Un párrafo vacío ya presente a continuación se reutiliza en vez de dejar dos
    const siguiente = bloque.nextElementSibling as HTMLElement | null;
    if (siguiente?.tagName === 'P' && !siguiente.textContent?.trim()) {
      bloque.remove();
      this.ubicarCursorEn(siguiente, false);
    } else {
      const parrafo = document.createElement('p');
      parrafo.innerHTML = '<br>';
      bloque.replaceWith(parrafo);
      this.ubicarCursorEn(parrafo, false);
    }
    this.alEscribir();
  }

  private ubicarCursorEnCelda(celda: HTMLTableCellElement | undefined) {
    if (celda) this.ubicarCursorEn(celda, false);
  }

  private escapar(texto: string): string {
    return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
