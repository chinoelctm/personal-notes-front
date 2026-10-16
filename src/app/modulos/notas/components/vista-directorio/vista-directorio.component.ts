import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import config from '../../../../../assets/config/config.json';
import { NotasStore } from '../../../../core/state/notas.store';
import { FiltroPrioridad } from '../../../../core/interfaces/Notas';
import { FolderResponse } from '../../../../core/interfaces/responses/FolderResponse';
import { IconoComponent } from '../../../../shared/icono/icono.component';
import { TarjetaDocumentoComponent } from '../tarjeta-documento/tarjeta-documento.component';

const FILTROS: { valor: FiltroPrioridad; etiqueta: string }[] = [
  { valor: 'Todas', etiqueta: 'Todas' },
  { valor: 'High', etiqueta: '🔴 Alta' },
  { valor: 'Medium', etiqueta: '🟡 Media' },
  { valor: 'Low', etiqueta: '🟢 Baja' },
  { valor: 'None', etiqueta: '⚪ Ninguna' }
];

@Component({
  selector: 'app-vista-directorio',
  standalone: true,
  imports: [IconoComponent, TarjetaDocumentoComponent],
  templateUrl: './vista-directorio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' }
})
export class VistaDirectorioComponent {

  protected readonly store = inject(NotasStore);
  protected readonly filtros = FILTROS;

  // Carpetas desde la raíz hasta la seleccionada, para la ruta navegable
  protected readonly ancestros = computed(() => {
    const porId = this.store.carpetasPorId();
    const ruta: FolderResponse[] = [];
    let actual = this.store.carpetaSeleccionada();
    while (actual && !ruta.includes(actual)) {
      ruta.unshift(actual);
      actual = actual.parentFolderId ? porId.get(actual.parentFolderId) ?? null : null;
    }
    return ruta;
  });

  protected puedeTenerSubcarpetas(nivel: number): boolean {
    return nivel < config.ProfundidadMaximaCarpetas;
  }
}
