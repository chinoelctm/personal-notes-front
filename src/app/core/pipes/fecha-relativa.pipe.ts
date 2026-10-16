import { Pipe, PipeTransform } from '@angular/core';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

// '2026-10-16T13:00:00Z' => 'Hace 6 h' (en la hora local del navegador)
@Pipe({
  standalone: true,
  name: 'fechaRelativa',
})
export class FechaRelativaPipe implements PipeTransform {
  transform(fecha: string | null | undefined, ahora: number = Date.now()): string {
    const instante = fecha ? Date.parse(fecha) : NaN;
    if (Number.isNaN(instante)) return '-';

    const diferencia = Math.max(0, ahora - instante);
    if (diferencia < MINUTO) return 'Hace un momento';
    if (diferencia < HORA) return `Hace ${Math.floor(diferencia / MINUTO)} min`;
    if (diferencia < DIA) return `Hace ${Math.floor(diferencia / HORA)} h`;
    if (diferencia < 2 * DIA) return 'Ayer';
    if (diferencia < 7 * DIA) return `Hace ${Math.floor(diferencia / DIA)} días`;

    return new Date(instante).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
