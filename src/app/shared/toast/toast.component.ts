import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/utils/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
  protected readonly toast = inject(ToastService).estado;
}
