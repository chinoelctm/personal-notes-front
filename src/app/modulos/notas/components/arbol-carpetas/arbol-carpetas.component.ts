import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotasStore } from '../../../../core/state/notas.store';
import { IconoComponent } from '../../../../shared/icono/icono.component';
import { NodoArbolComponent } from '../nodo-arbol/nodo-arbol.component';

@Component({
  selector: 'app-arbol-carpetas',
  standalone: true,
  imports: [IconoComponent, NodoArbolComponent],
  templateUrl: './arbol-carpetas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // El aside participa directo en el flex de la página (ocupa todo el alto)
  host: { class: 'contents' }
})
export class ArbolCarpetasComponent {

  protected readonly store = inject(NotasStore);
}
