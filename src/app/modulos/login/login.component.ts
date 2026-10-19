import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SesionStore } from '../../core/state/sesion.store';
import { IconoComponent } from '../../shared/icono/icono.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IconoComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 min-h-0 overflow-y-auto' }
})
export class LoginComponent implements OnDestroy {

  private readonly _sesion = inject(SesionStore);
  private readonly _router = inject(Router);

  protected readonly expirada = inject(ActivatedRoute).snapshot.queryParamMap.has('expirada');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mostrarClave = signal(false);
  // Render (plan gratis) duerme los servicios: el primer login puede tardar casi un minuto
  protected readonly despertando = signal(false);
  private avisoLento?: ReturnType<typeof setTimeout>;

  protected async entrar(evento: Event, usuario: string, clave: string) {
    evento.preventDefault();
    if (this.enviando()) return;
    if (!usuario.trim() || !clave) {
      this.error.set('Ingresa tu usuario y contraseña.');
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.avisoLento = setTimeout(() => this.despertando.set(true), 4000);

    const error = await this._sesion.iniciarSesion(usuario, clave);

    clearTimeout(this.avisoLento);
    this.despertando.set(false);
    this.enviando.set(false);

    if (error) {
      this.error.set(error);
      return;
    }
    this._router.navigate(['/']);
  }

  ngOnDestroy(): void {
    clearTimeout(this.avisoLento);
  }
}
