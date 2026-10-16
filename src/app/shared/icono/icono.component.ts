import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONOS, NombreIcono } from './iconos';

// Los SVG salen de una tabla fija (iconos.ts), nunca de datos del usuario: es seguro marcarlos como confiables
const cache = new Map<string, SafeHtml>();

/** Ícono de línea (Lucide) que hereda el color del texto: <app-icono nombre="folder" clase="w-4 h-4" />. */
@Component({
  selector: 'app-icono',
  standalone: true,
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0 items-center justify-center',
    'aria-hidden': 'true',
    '[innerHTML]': 'svg'
  }
})
export class IconoComponent {

  private readonly _sanitizer = inject(DomSanitizer);

  @Input({ required: true }) nombre!: NombreIcono;
  @Input() clase = 'w-4 h-4';

  protected get svg(): SafeHtml {
    const clave = `${this.nombre}|${this.clase}`;
    let html = cache.get(clave);
    if (!html) {
      html = this._sanitizer.bypassSecurityTrustHtml(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
        `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${this.clase}">${ICONOS[this.nombre]}</svg>`);
      cache.set(clave, html);
    }
    return html;
  }
}
