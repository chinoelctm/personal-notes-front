import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';

const ANCHO = 100;
const ALTO = 32;

/**
 * Línea de tendencia pequeña (sparkline) que toma el color del texto: <app-minigrafico [valores]="serie" class="text-sky-500" />.
 * La línea se dibuja de izquierda a derecha al aparecer.
 */
@Component({
  selector: 'app-minigrafico',
  standalone: true,
  imports: [],
  template: `
    <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" preserveAspectRatio="none" class="w-full h-full overflow-visible" aria-hidden="true">
      <path [attr.d]="area" fill="currentColor" fill-opacity="0.14" />
      <path [attr.d]="linea" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            vector-effect="non-scaling-stroke" pathLength="1" class="dibujar" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' }
})
export class MinigraficoComponent implements OnChanges {

  @Input({ required: true }) valores: number[] = [];

  protected readonly ancho = ANCHO;
  protected readonly alto = ALTO;
  protected linea = '';
  protected area = '';

  ngOnChanges(): void {
    const valores = this.valores.length > 1 ? this.valores : [0, ...this.valores, 0].slice(0, 2);
    const max = Math.max(...valores);
    const min = Math.min(...valores);
    const rango = max - min || 1;
    // Un margen arriba y abajo para que la línea no toque los bordes
    const puntos = valores.map((v, i) => [
      (i / (valores.length - 1)) * ANCHO,
      ALTO - 3 - ((v - min) / rango) * (ALTO - 6)
    ]);

    this.linea = puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    this.area = `${this.linea} L${ANCHO} ${ALTO} L0 ${ALTO} Z`;
  }
}
