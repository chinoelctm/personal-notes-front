import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { apiUrl } from './api';
import { LoginRequest } from '../interfaces/requests/LoginRequest';
import { UsuarioResponse } from '../interfaces/responses/UsuarioResponse';

/** Rutas de personal-notes-auth-services. Llegan por el mismo origen (rewrite de Render / proxy de ng serve). */
export const authUrl = `${apiUrl}/auth`;

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  protected _http = inject(HttpClient);

  // Deja auth_token (15 min) y refresh_token (7 días) en cookies HttpOnly
  async iniciarSesion(request: LoginRequest): Promise<UsuarioResponse> {
    return lastValueFrom(this._http.post<UsuarioResponse>(`${authUrl}/login`, request));
  }

  // Rota el refresh_token y renueva ambas cookies
  async refrescar(): Promise<void> {
    await lastValueFrom(this._http.post<void>(`${authUrl}/refresh`, null));
  }

  async cerrarSesion(): Promise<void> {
    await lastValueFrom(this._http.post<void>(`${authUrl}/logout`, null));
  }

  async obtenerUsuario(): Promise<UsuarioResponse> {
    return lastValueFrom(this._http.get<UsuarioResponse>(`${authUrl}/me`));
  }
}
