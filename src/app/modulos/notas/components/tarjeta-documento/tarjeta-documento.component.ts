import { ChangeDetectionStrategy, Component, inject, Input, OnChanges } from '@angular/core';
import config from '../../../../../assets/config/config.json';
import { NotasStore } from '../../../../core/state/notas.store';
import { VistaPreviaService } from '../../../../core/utils/vista-previa.service';
import { DocumentResponse } from '../../../../core/interfaces/responses/DocumentResponse';
import { FechaRelativaPipe } from '../../../../core/pipes/fecha-relativa.pipe';
import { FechaHoraPipe } from '../../../../core/pipes/fecha-hora.pipe';
import { IconoComponent } from '../../../../shared/icono/icono.component';
import { InsigniaPrioridadComponent } from '../../../../shared/insignia-prioridad/insignia-prioridad.component';

/** Tarjeta de la vista de directorio: título, banderita, vista previa del contenido y fechas. */
@Component({
  selector: 'app-tarjeta-documento',
  standalone: true,
  imports: [FechaRelativaPipe, FechaHoraPipe, IconoComponent, InsigniaPrioridadComponent],
  templateUrl: './tarjeta-documento.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TarjetaDocumentoComponent implements OnChanges {

  protected readonly store = inject(NotasStore);
  private readonly _vistaPrevia = inject(VistaPreviaService);

  @Input({ required: true }) documento!: DocumentResponse;

  protected vistaPrevia = '';

  // Se calcula una vez por versión del documento (el HTML puede ser grande)
  ngOnChanges(): void {
    this.vistaPrevia = this._vistaPrevia.vistaPrevia(this.documento.content, config.LargoVistaPrevia);
  }
}
