import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import { ToastComponent } from './shared/toast/toast.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, ToastComponent, ConfirmDialogComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'personal-notes';
}
