import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import config from '../../../../../assets/config/config.json';
import { NotasStore } from '../../../../core/state/notas.store';
import { NodoCarpeta } from '../../../../core/interfaces/Notas';
import { PRIORIDADES } from '../../../../core/utils/prioridades';
import { IconoComponent } from '../../../../shared/icono/icono.component';

const SANGRIA_BASE_PX = 4;
const SANGRIA_POR_NIVEL_PX = 14;

/** Una carpeta del árbol lateral con sus subcarpetas (recursivo) y sus documentos. */
@Component({
  selector: 'app-nodo-arbol',
  standalone: true,
  imports: [IconoComponent],
  templateUrl: './nodo-arbol.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NodoArbolComponent {

  protected readonly store = inject(NotasStore);
  protected readonly prioridades = PRIORIDADES;

  @Input({ required: true }) nodo!: NodoCarpeta;
  @Input() nivel = 0;

  // Barra de acciones de la carpeta en el teléfono
  protected accionesAbiertas = false;

  protected get sangria(): number {
    return SANGRIA_BASE_PX + this.nivel * SANGRIA_POR_NIVEL_PX;
  }

  protected get expandida(): boolean {
    return this.store.expandidas().has(this.nodo.carpeta.id);
  }

  protected get seleccionada(): boolean {
    return this.store.vista() === 'directorio' && this.store.carpetaSeleccionadaId() === this.nodo.carpeta.id;
  }

  protected get documentoActivoId(): string | null {
    return this.store.vista() === 'editor' ? this.store.borrador()?.documentoId ?? null : null;
  }

  // Vista previa de la regla de profundidad (la API la valida al crear)
  protected get puedeTenerSubcarpetas(): boolean {
    return this.nodo.carpeta.depth < config.ProfundidadMaximaCarpetas;
  }
}
