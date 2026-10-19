import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../http/auth.service';
import { UsuarioResponse } from '../interfaces/responses/UsuarioResponse';
import { AlmacenamientoLocalService, CLAVES_LOCALES } from '../utils/almacenamiento-local.service';
import { mensajeDeError } from '../utils/api-error';

export type EstadoSesion = 'verificando' | 'autenticado' | 'anonimo';

/**
 * Sesión del usuario. El front no ve los tokens (cookies HttpOnly): solo sabe quién es el usuario según
 * /auth/me. Cuando el access token vence, el interceptor llama a renovar() y reintenta.
 */
@Injectable({
  providedIn: 'root'
})
export class SesionStore {

  private readonly _authService = inject(AuthService);
  private readonly _almacenamiento = inject(AlmacenamientoLocalService);
  private readonly _router = inject(Router);

  readonly usuario = signal<UsuarioResponse | null>(null);
  readonly estado = signal<EstadoSesion>('verificando');
  readonly autenticado = computed(() => this.estado() === 'autenticado');

  // Un solo refresh a la vez: si varias llamadas reciben 401 juntas, todas esperan la misma renovación
  private renovacion: Promise<boolean> | null = null;
  private verificacion: Promise<boolean> | null = null;

  /** Al abrir la app: ¿hay sesión? Se consulta una vez; el guard la reutiliza en cada navegación. */
  verificar(): Promise<boolean> {
    if (this.estado() !== 'verificando') return Promise.resolve(this.autenticado());
    this.verificacion ??= this.cargarUsuario().finally(() => this.verificacion = null);
    return this.verificacion;
  }

  /** Devuelve null si entró, o el mensaje de error para mostrar en el formulario. */
  async iniciarSesion(username: string, password: string): Promise<string | null> {
    try {
      const usuario = await this._authService.iniciarSesion({ username: username.trim(), password });
      this.establecer(usuario);
      return null;
    } catch (error) {
      return mensajeDeError(error);
    }
  }

  /** Rota el refresh token. Devuelve false si la sesión ya no se puede renovar. */
  renovar(): Promise<boolean> {
    this.renovacion ??= this.intentarRenovar().finally(() => this.renovacion = null);
    return this.renovacion;
  }

  /** La sesión venció y no se pudo renovar: al login, conservando borradores y copia local. */
  expirar() {
    this.usuario.set(null);
    this.estado.set('anonimo');
    // Varias llamadas pueden fallar juntas: una sola navegación
    if (this._router.url.startsWith('/login')) return;
    this._router.navigate(['/login'], { queryParams: { expirada: 1 } });
  }

  /**
   * Cierra la sesión y borra de este navegador las notas (copia local, borradores y vista abierta).
   * Recarga la página para no dejar datos en memoria.
   */
  async cerrarSesion() {
    try {
      await this._authService.cerrarSesion();
    } catch {
      // Aunque la API no responda, se limpia lo local; la cookie de refresh igual vence a los 7 días
    }
    for (const clave of Object.values(CLAVES_LOCALES)) {
      this._almacenamiento.eliminar(clave);
    }
    window.location.assign('/login');
  }

  private async intentarRenovar(): Promise<boolean> {
    try {
      await this._authService.refrescar();
      return true;
    } catch {
      // Otra pestaña pudo rotar el refresh token justo antes: si las cookies nuevas ya sirven, sigue la sesión
      return this.cargarUsuario();
    }
  }

  private async cargarUsuario(): Promise<boolean> {
    try {
      this.establecer(await this._authService.obtenerUsuario());
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401 && await this.refrescarSinReintento()) {
        try {
          this.establecer(await this._authService.obtenerUsuario());
          return true;
        } catch {
          // Cae al estado anónimo
        }
      }
      this.usuario.set(null);
      this.estado.set('anonimo');
      return false;
    }
  }

  private async refrescarSinReintento(): Promise<boolean> {
    try {
      await this._authService.refrescar();
      return true;
    } catch {
      return false;
    }
  }

  private establecer(usuario: UsuarioResponse) {
    this.usuario.set(usuario);
    this.estado.set('autenticado');
  }
}
