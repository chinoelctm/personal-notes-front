import { Pipe, PipeTransform } from '@angular/core';
import { Priority } from '../interfaces/responses/DocumentResponse';
import { PRIORIDADES } from '../utils/prioridades';

// 'High' => 'Alta'
@Pipe({
  standalone: true,
  name: 'etiquetaPrioridad',
})
export class EtiquetaPrioridadPipe implements PipeTransform {
  transform(prioridad: Priority | null | undefined): string {
    return prioridad ? PRIORIDADES[prioridad].etiqueta : '-';
  }
}
