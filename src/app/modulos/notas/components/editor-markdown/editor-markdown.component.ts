import {
  ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, untracked, ViewChild
} from '@angular/core';
import config from '../../../../../assets/config/config.json';
import { NotasStore } from '../../../../core/state/notas.store';
import { ToastService } from '../../../../core/utils/toast.service';
import { markdownAHtml, tituloDeMarkdown } from '../../../../core/utils/markdown';
import { IconoComponent } from '../../../../shared/icono/icono.component';
import { NombreIcono } from '../../../../shared/icono/iconos';

type ModoMarkdown = 'codigo' | 'dividido' | 'vista';

interface HerramientaMarkdown {
  titulo:  string;
  icono?:  NombreIcono;
  texto?:  string;
  accion:  () => void;
  separador?: boolean;
}

const ESPERA_GUARDADO_MS = 400;
const PANTALLA_ANCHA_PX = 1024;

const TABLA_MARKDOWN = '\n| Columna 1 | Columna 2 |\n| --- | --- |\n| Dato | Dato |\n';

/**
 * Documento en Markdown: el texto a un lado y el documento ya formateado al otro. La vista previa usa los
 * mismos estilos que las notas (.contenido-nota) y pasa por el saneamiento de Angular, así que el HTML que
 * traiga el Markdown no puede ejecutar scripts.
 */
@Component({
  selector: 'app-editor-markdown',
  standalone: true,
  imports: [IconoComponent],
  templateUrl: './editor-markdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' }
})
export class EditorMarkdownComponent implements OnDestroy {

  protected readonly store = inject(NotasStore);
  private readonly _toastService = inject(ToastService);

  protected modo: ModoMarkdown = 'vista';
  protected arrastrando = false;

  private codigoRef?: ElementRef<HTMLTextAreaElement>;
  private temporizador?: ReturnType<typeof setTimeout>;

  protected readonly carpetasOrdenadas = computed(() =>
    [...this.store.carpetas()].sort((a, b) => a.path.join('/').localeCompare(b.path.join('/'), 'es')));

  // Se recalcula cuando se guarda el borrador (tras la espera de escritura), no en cada tecla
  protected readonly html = computed(() => markdownAHtml(this.store.borrador()?.content));

  protected readonly herramientas: HerramientaMarkdown[] = [
    { titulo: 'Negrita', icono: 'bold', accion: () => this.envolver('**', '**', 'texto en negrita') },
    { titulo: 'Cursiva', icono: 'italic', accion: () => this.envolver('_', '_', 'texto en cursiva'), separador: true },
    { titulo: 'Título', texto: 'H2', accion: () => this.prefijarLineas('## ') },
    { titulo: 'Subtítulo', texto: 'H3', accion: () => this.prefijarLineas('### '), separador: true },
    { titulo: 'Lista con viñetas', icono: 'list', accion: () => this.prefijarLineas('- ') },
    { titulo: 'Lista numerada', icono: 'list-ordered', accion: () => this.prefijarLineas('1. ') },
    { titulo: 'Cita', icono: 'quote', accion: () => this.prefijarLineas('> '), separador: true },
    { titulo: 'Bloque de código', icono: 'code-xml', accion: () => this.envolver('\n```\n', '\n```\n', 'código') },
    { titulo: 'Tabla', icono: 'table', accion: () => this.insertar(TABLA_MARKDOWN) },
    { titulo: 'Enlace', icono: 'external-link', accion: () => this.envolver('[', '](https://)', 'texto del enlace') }
  ];

  @ViewChild('codigo') set codigo(ref: ElementRef<HTMLTextAreaElement> | undefined) {
    const nuevo = ref !== undefined && ref.nativeElement !== this.codigoRef?.nativeElement;
    this.codigoRef = ref;
    if (nuevo) this.cargarCodigo();
  }

  constructor() {
    // Abrir otro documento sin salir del editor: se recarga el texto. Uno nuevo parte escribiendo (con la
    // vista al lado en pantallas anchas); uno publicado, leyéndose como documento
    effect(() => {
      this.store.aperturaEditor();
      untracked(() => {
        const nuevo = !this.store.borrador()?.documentoId;
        this.modo = !nuevo ? 'vista' : window.innerWidth >= PANTALLA_ANCHA_PX ? 'dividido' : 'codigo';
        this.cargarCodigo();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.guardarCodigo();
    }
  }

  protected cambiarModo(modo: ModoMarkdown) {
    this.guardarAhora();
    this.modo = modo;
  }

  protected cambiarTitulo(event: Event) {
    this.store.actualizarBorrador({ title: (event.target as HTMLInputElement).value });
  }

  protected moverA(event: Event) {
    this.store.actualizarBorrador({ folderId: (event.target as HTMLSelectElement).value });
  }

  protected alEscribir() {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.temporizador = undefined;
      this.guardarCodigo();
    }, ESPERA_GUARDADO_MS);
  }

  protected alPresionarTecla(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.guardarAhora();
      this.store.publicar();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      this.envolver('**', '**', 'texto en negrita');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      this.envolver('_', '_', 'texto en cursiva');
      return;
    }
    // Tab indenta (listas anidadas, código) en vez de salir del área de texto
    if (event.key === 'Tab') {
      event.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  }

  protected async cargarDesdeSelector(input: HTMLInputElement) {
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) await this.cargarArchivo(archivo);
  }

  protected alArrastrar(event: DragEvent) {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.arrastrando = true;
  }

  protected async alSoltar(event: DragEvent) {
    this.arrastrando = false;
    const archivo = event.dataTransfer?.files?.[0];
    if (!archivo) return;
    event.preventDefault();
    await this.cargarArchivo(archivo);
  }

  // ---------- Barra de formato ----------

  /** Rodea la selección (o un texto de ejemplo seleccionado) con la sintaxis indicada. */
  private envolver(antes: string, despues: string, ejemplo: string) {
    const area = this.codigoRef?.nativeElement;
    if (!area) return;
    const { selectionStart: inicio, selectionEnd: fin, value } = area;
    const seleccion = value.slice(inicio, fin) || ejemplo;

    this.reemplazarSeleccion(`${antes}${seleccion}${despues}`);
    area.setSelectionRange(inicio + antes.length, inicio + antes.length + seleccion.length);
  }

  /** Agrega el prefijo (## , - , > …) al inicio de cada línea seleccionada. */
  private prefijarLineas(prefijo: string) {
    const area = this.codigoRef?.nativeElement;
    if (!area) return;
    const { value } = area;
    const inicio = value.lastIndexOf('\n', area.selectionStart - 1) + 1;
    const finLinea = value.indexOf('\n', area.selectionEnd);
    const fin = finLinea === -1 ? value.length : finLinea;

    area.setSelectionRange(inicio, fin);
    const lineas = value.slice(inicio, fin).split('\n').map(linea => prefijo + linea.replace(/^(#{1,6} |[-*] |\d+\. |> )/, ''));
    this.reemplazarSeleccion(lineas.join('\n'));
  }

  private insertar(texto: string) {
    this.reemplazarSeleccion(texto);
  }

  // insertText mantiene el historial del textarea: Ctrl+Z deshace también lo que agregó la barra
  private reemplazarSeleccion(texto: string) {
    const area = this.codigoRef?.nativeElement;
    if (!area) return;
    area.focus();
    if (!document.execCommand('insertText', false, texto)) {
      area.setRangeText(texto, area.selectionStart, area.selectionEnd, 'end');
    }
    this.guardarAhora();
  }

  // ---------- Privados ----------

  private async cargarArchivo(archivo: File) {
    const esMarkdown = /\.(md|markdown|mdown|txt)$/i.test(archivo.name) || archivo.type === 'text/markdown';
    if (!esMarkdown) {
      this._toastService.mostrar(`"${archivo.name}" no es un archivo .md`, '⚠️');
      return;
    }
    if (archivo.size > config.TamanoMaximoMarkdownMb * 1024 * 1024) {
      this._toastService.mostrar(`El archivo supera los ${config.TamanoMaximoMarkdownMb} MB`, '⚠️');
      return;
    }

    const contenido = await archivo.text();
    const borrador = this.store.borrador();
    // Si el documento aún no tiene título, se usa el primer "# Título" del archivo (o su nombre)
    const titulo = borrador?.title.trim()
      ? undefined
      : tituloDeMarkdown(contenido) ?? archivo.name.replace(/\.[^.]+$/, '');

    clearTimeout(this.temporizador);
    this.temporizador = undefined;
    this.store.actualizarBorrador(titulo ? { content: contenido, title: titulo } : { content: contenido });
    this.cargarCodigo();
    this.modo = 'vista';
    this._toastService.mostrar(`"${archivo.name}" cargado`, '📄');
  }

  private guardarAhora() {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = undefined;
    }
    this.guardarCodigo();
  }

  private guardarCodigo() {
    const codigo = this.codigoRef?.nativeElement.value;
    if (codigo !== undefined && codigo !== this.store.borrador()?.content) {
      this.store.actualizarBorrador({ content: codigo });
    }
  }

  // El textarea no se enlaza con [value]: reasignarlo en cada cambio movería el cursor al final
  private cargarCodigo() {
    const area = this.codigoRef?.nativeElement;
    const contenido = this.store.borrador()?.content ?? '';
    if (area && area.value !== contenido) area.value = contenido;
  }
}
