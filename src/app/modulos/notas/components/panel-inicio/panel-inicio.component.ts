import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import config from '../../../../../assets/config/config.json';
import { NotasStore } from '../../../../core/state/notas.store';
import { VistaPreviaService } from '../../../../core/utils/vista-previa.service';
import { FechaRelativaPipe } from '../../../../core/pipes/fecha-relativa.pipe';
import { FechaHoraPipe } from '../../../../core/pipes/fecha-hora.pipe';
import { IconoComponent } from '../../../../shared/icono/icono.component';
import { InsigniaPrioridadComponent } from '../../../../shared/insignia-prioridad/insignia-prioridad.component';

@Component({
  selector: 'app-panel-inicio',
  standalone: true,
  imports: [LowerCasePipe, FechaRelativaPipe, FechaHoraPipe, IconoComponent, InsigniaPrioridadComponent],
  templateUrl: './panel-inicio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' }
})
export class PanelInicioComponent {

  protected readonly store = inject(NotasStore);
  private readonly _vistaPrevia = inject(VistaPreviaService);

  protected readonly resumen = this.store.resumen;
  protected readonly cantidadRecientes = config.CantidadRecientes;

  protected vistaPrevia(html: string): string {
    return this._vistaPrevia.vistaPrevia(html, config.LargoVistaPrevia);
  }
}
