import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import config from '../../../../../assets/config/config.json';
import { DocumentResponse } from '../../../../core/interfaces/responses/DocumentResponse';
import { NotasStore } from '../../../../core/state/notas.store';
import { SesionStore } from '../../../../core/state/sesion.store';
import { VistaPreviaService } from '../../../../core/utils/vista-previa.service';
import { actividadPorDia, totalAcumulado } from '../../../../core/utils/actividad';
import { FechaRelativaPipe } from '../../../../core/pipes/fecha-relativa.pipe';
import { FechaHoraPipe } from '../../../../core/pipes/fecha-hora.pipe';
import { IconoComponent } from '../../../../shared/icono/icono.component';
import { InsigniaPrioridadComponent } from '../../../../shared/insignia-prioridad/insignia-prioridad.component';
import { MinigraficoComponent } from '../../../../shared/minigrafico/minigrafico.component';

// Días que muestran el gráfico de actividad y los minigráficos
const DIAS_ACTIVIDAD = 14;

@Component({
  selector: 'app-panel-inicio',
  standalone: true,
  imports: [LowerCasePipe, FechaRelativaPipe, FechaHoraPipe, IconoComponent, InsigniaPrioridadComponent, MinigraficoComponent],
  templateUrl: './panel-inicio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' }
})
export class PanelInicioComponent {

  protected readonly store = inject(NotasStore);
  private readonly _sesion = inject(SesionStore);
  private readonly _vistaPrevia = inject(VistaPreviaService);

  protected readonly resumen = this.store.resumen;
  protected readonly cantidadRecientes = config.CantidadRecientes;
  protected readonly diasActividad = DIAS_ACTIVIDAD;

  protected readonly saludo = computed(() => {
    const hora = new Date().getHours();
    const nombre = this._sesion.usuario()?.name.split(/\s+/)[0];
    const momento = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
    return nombre ? `${momento}, ${nombre}` : momento;
  });

  // Documentos por día de su última edición (la API no guarda el historial de cada edición)
  protected readonly actividad = computed(() =>
    actividadPorDia(this.store.documentos().map(d => d.updatedOn), DIAS_ACTIVIDAD));

  protected readonly maximoActividad = computed(() => Math.max(1, ...this.actividad().map(d => d.cantidad)));

  protected readonly serieEdiciones = computed(() => this.actividad().map(d => d.cantidad));

  protected readonly serieTotal = computed(() =>
    totalAcumulado(this.store.documentos().map(d => d.createdOn), DIAS_ACTIVIDAD));

  // Proporción de cada prioridad sobre el total, para las barras de las tarjetas
  protected readonly porcentajes = computed(() => {
    const resumen = this.resumen();
    const total = resumen?.totalDocuments || 1;
    return {
      alta: Math.round(((resumen?.byPriority.high ?? 0) / total) * 100),
      media: Math.round(((resumen?.byPriority.medium ?? 0) / total) * 100),
      baja: Math.round(((resumen?.byPriority.low ?? 0) / total) * 100)
    };
  });

  protected vistaPrevia(documento: DocumentResponse): string {
    return this._vistaPrevia.vistaPrevia(documento.content, config.LargoVistaPrevia, documento.type);
  }

  protected iconoDe(documento: DocumentResponse): 'code-xml' | 'hash' | 'file-text' {
    return documento.type === 'Html' ? 'code-xml' : documento.type === 'Markdown' ? 'hash' : 'file-text';
  }
}
