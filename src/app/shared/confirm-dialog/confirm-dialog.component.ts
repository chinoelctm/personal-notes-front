import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/utils/confirm.service';
import { EstiloOpcion } from '../../core/interfaces/Confirmacion';

const ESTILOS: Record<EstiloOpcion, string> = {
  primario: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20',
  peligro: 'bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-500/20',
  secundario: 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700',
};

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [],
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {

  protected readonly confirmService = inject(ConfirmService);

  protected estilo(estilo: EstiloOpcion): string {
    return ESTILOS[estilo];
  }
}
