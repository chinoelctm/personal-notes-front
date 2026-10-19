import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import { ToastComponent } from './shared/toast/toast.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { SesionStore } from './core/state/sesion.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, ToastComponent, ConfirmDialogComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'personal-notes';

  // El header (buscador, respaldos, asistente) solo tiene sentido con sesión
  protected readonly sesion = inject(SesionStore);
}
