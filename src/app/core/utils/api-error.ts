import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from '../interfaces/responses/ProblemDetails';

/** Convierte un error HTTP de la API en un mensaje legible para el usuario. */
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrió un error inesperado.';
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor.';
  }

  const problema = error.error as ProblemDetails | null;
  const primerErrorDeCampo = problema?.errors ? Object.values(problema.errors).flat()[0] : undefined;
  return primerErrorDeCampo ?? problema?.detail ?? problema?.title ?? `Error ${error.status}`;
}
