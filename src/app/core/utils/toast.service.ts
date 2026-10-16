import { Injectable, signal } from '@angular/core';
import { EstadoToast } from '../interfaces/Toast';

const DURACION_MS = 2500;

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  public readonly estado = signal<EstadoToast>({ visible: false, mensaje: '', icono: '✓' });

  private temporizador?: ReturnType<typeof setTimeout>;

  mostrar(mensaje: string, icono: string = '✓') {
    clearTimeout(this.temporizador);
    this.estado.set({ visible: true, mensaje, icono });
    this.temporizador = setTimeout(() => {
      this.estado.update(estado => ({ ...estado, visible: false }));
    }, DURACION_MS);
  }
}
