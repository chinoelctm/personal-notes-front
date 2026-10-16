import { Injectable, signal } from '@angular/core';
import { SolicitudConfirmacion } from '../interfaces/Confirmacion';

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {

  public readonly solicitud = signal<SolicitudConfirmacion | null>(null);

  private resolver: ((valor: string | null) => void) | null = null;

  // Resuelve con el `valor` de la opción elegida, o null si se descarta
  preguntar(solicitud: SolicitudConfirmacion): Promise<string | null> {
    this.resolver?.(null);
    this.solicitud.set(solicitud);
    return new Promise(resolve => this.resolver = resolve);
  }

  responder(valor: string | null) {
    this.resolver?.(valor);
    this.resolver = null;
    this.solicitud.set(null);
  }
}
