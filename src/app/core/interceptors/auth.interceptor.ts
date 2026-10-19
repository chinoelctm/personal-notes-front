import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { apiUrl } from '../http/api';
import { authUrl } from '../http/auth.service';
import { SesionStore } from '../state/sesion.store';

/**
 * Los tokens viajan solos en cookies HttpOnly (mismo origen), así que no hay header que agregar. Si la API
 * responde 401 porque el access token (15 min) venció, se renueva con el refresh token y se reintenta una
 * vez; si no se puede renovar, se manda al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Las rutas de auth resuelven sus propios 401 (credenciales inválidas, refresh vencido)
  if (!req.url.startsWith(apiUrl) || req.url.startsWith(authUrl)) {
    return next(req);
  }

  const sesion = inject(SesionStore);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return from(sesion.renovar()).pipe(
        switchMap(renovada => {
          if (renovada) return next(req);
          sesion.expirar();
          return throwError(() => error);
        })
      );
    })
  );
};
