import {
  ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, untracked, ViewChild
} from '@angular/core';
import config from '../../../../../assets/config/config.json';
import { NotasStore } from '../../../../core/state/notas.store';
import { ToastService } from '../../../../core/utils/toast.service';
import { IconoComponent } from '../../../../shared/icono/icono.component';

type ModoHtml = 'codigo' | 'dividido' | 'vista';

const ESPERA_GUARDADO_MS = 400;

/**
 * Página HTML propia: código a un lado y vista previa al otro. La vista previa es un iframe con
 * sandbox="allow-scripts" y sin allow-same-origin: el JavaScript de la página corre, pero en un origen
 * aislado, sin acceso al localStorage, las cookies ni la API de la app.
 */
@Component({
  selector: 'app-editor-html',
  standalone: true,
  imports: [IconoComponent],
  templateUrl: './editor-html.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' }
})
export class EditorHtmlComponent implements OnDestroy {

  protected readonly store = inject(NotasStore);
  private readonly _toastService = inject(ToastService);

  // Una página nueva parte mostrando el código; una publicada, la vista previa
  protected modo: ModoHtml = 'vista';
  protected arrastrando = false;

  private codigoRef?: ElementRef<HTMLTextAreaElement>;
  private vistaRef?: ElementRef<HTMLIFrameElement>;
  private temporizador?: ReturnType<typeof setTimeout>;

  protected readonly carpetasOrdenadas = computed(() =>
    [...this.store.carpetas()].sort((a, b) => a.path.join('/').localeCompare(b.path.join('/'), 'es')));

  protected readonly tamano = computed(() => {
    const bytes = new Blob([this.store.borrador()?.content ?? '']).size;
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  });

  @ViewChild('codigo') set codigo(ref: ElementRef<HTMLTextAreaElement> | undefined) {
    const nuevo = ref !== undefined && ref.nativeElement !== this.codigoRef?.nativeElement;
    this.codigoRef = ref;
    if (nuevo) this.cargarCodigo();
  }

  @ViewChild('vista') set vista(ref: ElementRef<HTMLIFrameElement> | undefined) {
    const nuevo = ref !== undefined && ref.nativeElement !== this.vistaRef?.nativeElement;
    this.vistaRef = ref;
    if (nuevo) this.actualizarVista();
  }

  constructor() {
    // Abrir otra página sin salir del editor: se recarga el código y la vista
    effect(() => {
      this.store.aperturaEditor();
      untracked(() => {
        const borrador = this.store.borrador();
        this.modo = borrador?.documentoId ? 'vista' : 'codigo';
        this.cargarCodigo();
        this.actualizarVista();
      });
    });
  }

  ngOnDestroy(): void {
    // Lo último que se escribió no se pierde aunque se salga antes del guardado diferido
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.guardarCodigo();
    }
  }

  protected cambiarModo(modo: ModoHtml) {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = undefined;
      this.guardarCodigo();
    }
    this.modo = modo;
    this.actualizarVista();
  }

  protected cambiarTitulo(event: Event) {
    this.store.actualizarBorrador({ title: (event.target as HTMLInputElement).value });
  }

  protected moverA(event: Event) {
    this.store.actualizarBorrador({ folderId: (event.target as HTMLSelectElement).value });
  }

  // Cada tecla reinicia la espera: con páginas de varios MB no se guarda ni se recarga la vista en cada una
  protected alEscribir() {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.temporizador = undefined;
      this.guardarCodigo();
      this.actualizarVista();
    }, ESPERA_GUARDADO_MS);
  }

  protected alPresionarTecla(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      clearTimeout(this.temporizador);
      this.temporizador = undefined;
      this.guardarCodigo();
      this.store.publicar();
      return;
    }
    // Tab indenta en vez de salir del área de código
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

  protected pantallaCompleta() {
    this.vistaRef?.nativeElement.requestFullscreen?.().catch(() =>
      this._toastService.mostrar('El navegador no permitió la pantalla completa', 'ℹ'));
  }

  // ---------- Privados ----------

  private async cargarArchivo(archivo: File) {
    const esHtml = /\.(html?|xhtml)$/i.test(archivo.name) || archivo.type === 'text/html';
    if (!esHtml) {
      this._toastService.mostrar(`"${archivo.name}" no es un archivo .html`, '⚠️');
      return;
    }
    if (archivo.size > config.TamanoMaximoHtmlMb * 1024 * 1024) {
      this._toastService.mostrar(`El archivo supera los ${config.TamanoMaximoHtmlMb} MB`, '⚠️');
      return;
    }

    const contenido = await archivo.text();
    const borrador = this.store.borrador();
    // Si la página aún no tiene título, se usa el <title> del archivo (o su nombre)
    const titulo = borrador?.title.trim()
      ? undefined
      : (contenido.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || archivo.name.replace(/\.[^.]+$/, ''));

    this.store.actualizarBorrador(titulo ? { content: contenido, title: titulo } : { content: contenido });
    this.cargarCodigo();
    this.modo = 'vista';
    this.actualizarVista();
    this._toastService.mostrar(`"${archivo.name}" cargado (${this.tamano()})`, '📄');
  }

  private guardarCodigo() {
    const codigo = this.codigoRef?.nativeElement.value;
    if (codigo !== undefined && codigo !== this.store.borrador()?.content) {
      this.store.actualizarBorrador({ content: codigo });
    }
  }

  // El textarea no se enlaza con [value]: con varios MB, reasignarlo en cada cambio sería lento
  private cargarCodigo() {
    const area = this.codigoRef?.nativeElement;
    const contenido = this.store.borrador()?.content ?? '';
    if (area && area.value !== contenido) area.value = contenido;
  }

  // srcdoc se asigna directo al iframe (sin el saneamiento de Angular, que quitaría los scripts): el aislamiento
  // lo da el atributo sandbox
  private actualizarVista() {
    const iframe = this.vistaRef?.nativeElement;
    const contenido = this.store.borrador()?.content ?? '';
    if (iframe && iframe.srcdoc !== contenido) iframe.srcdoc = contenido;
  }
}
