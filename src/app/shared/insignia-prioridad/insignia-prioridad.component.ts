import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Priority } from '../../core/interfaces/responses/DocumentResponse';
import { EstiloPrioridad, PRIORIDADES } from '../../core/utils/prioridades';

/** Banderita de prioridad: punto de color + etiqueta. "Ninguna" no se muestra salvo que se pida. */
@Component({
  selector: 'app-insignia-prioridad',
  standalone: true,
  imports: [],
  template: `
    @if (prioridad !== 'None' || mostrarNinguna) {
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap"
            [class]="estilo.insignia">
        <span class="w-1.5 h-1.5 rounded-full" [class]="estilo.punto"></span>
        {{ estilo.etiqueta }}
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InsigniaPrioridadComponent {
  @Input({ required: true }) prioridad!: Priority;
  @Input() mostrarNinguna = false;

  protected get estilo(): EstiloPrioridad {
    return PRIORIDADES[this.prioridad];
  }
}
