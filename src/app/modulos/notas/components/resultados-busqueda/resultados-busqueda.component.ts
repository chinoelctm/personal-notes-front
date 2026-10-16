import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { NotasStore } from '../../../../core/state/notas.store';
import { SegmentoTexto, VistaPreviaService } from '../../../../core/utils/vista-previa.service';
import { FechaRelativaPipe } from '../../../../core/pipes/fecha-relativa.pipe';
import { IconoComponent } from '../../../../shared/icono/icono.component';
import { InsigniaPrioridadComponent } from '../../../../shared/insignia-prioridad/insignia-prioridad.component';

@Component({
  selector: 'app-resultados-busqueda',
  standalone: true,
  imports: [LowerCasePipe, FechaRelativaPipe, IconoComponent, InsigniaPrioridadComponent],
  templateUrl: './resultados-busqueda.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' }
})
export class ResultadosBusquedaComponent {

  protected readonly store = inject(NotasStore);
  private readonly _vistaPrevia = inject(VistaPreviaService);

  // Resaltado sin innerHTML: el texto de las notas nunca se interpreta como HTML
  protected segmentos(texto: string): SegmentoTexto[] {
    return this._vistaPrevia.segmentos(texto, this.store.consulta());
  }
}
