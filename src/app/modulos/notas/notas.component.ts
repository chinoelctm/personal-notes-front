import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { NotasStore } from '../../core/state/notas.store';
import { IconoComponent } from '../../shared/icono/icono.component';
import { ArbolCarpetasComponent } from './components/arbol-carpetas/arbol-carpetas.component';
import { PanelInicioComponent } from './components/panel-inicio/panel-inicio.component';
import { VistaDirectorioComponent } from './components/vista-directorio/vista-directorio.component';
import { EditorDocumentoComponent } from './components/editor-documento/editor-documento.component';
import { ResultadosBusquedaComponent } from './components/resultados-busqueda/resultados-busqueda.component';
import { ModalCarpetaComponent } from './components/modal-carpeta/modal-carpeta.component';
import { PanelAsistenteComponent } from './components/panel-asistente/panel-asistente.component';

@Component({
  selector: 'app-notas',
  standalone: true,
  imports: [
    IconoComponent,
    ArbolCarpetasComponent,
    PanelInicioComponent,
    VistaDirectorioComponent,
    EditorDocumentoComponent,
    ResultadosBusquedaComponent,
    ModalCarpetaComponent,
    PanelAsistenteComponent
  ],
  templateUrl: './notas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' }
})
export class NotasComponent implements OnInit {

  protected readonly store = inject(NotasStore);

  ngOnInit(): void {
    this.store.inicializar();
  }
}
