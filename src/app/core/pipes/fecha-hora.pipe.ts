import { Pipe, PipeTransform } from '@angular/core';

// '2026-10-16T19:02:21Z' => '16-10-2026 16:02' (la API guarda UTC; se muestra en la hora local)
@Pipe({
  standalone: true,
  name: 'fechaHora',
})
export class FechaHoraPipe implements PipeTransform {
  transform(fecha: string | null | undefined): string {
    const instante = fecha ? Date.parse(fecha) : NaN;
    if (Number.isNaN(instante)) return '-';

    return new Date(instante).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
