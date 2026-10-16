import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import config from '../../../../../assets/config/config.json';
import { NotasStore } from '../../../../core/state/notas.store';
import { ArbolService, OpcionCarpeta } from '../../../../core/utils/arbol.service';
import { IconoComponent } from '../../../../shared/icono/icono.component';

@Component({
  selector: 'app-modal-carpeta',
  standalone: true,
  imports: [FormsModule, IconoComponent],
  templateUrl: './modal-carpeta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalCarpetaComponent implements OnInit, AfterViewInit {

  protected readonly store = inject(NotasStore);
  private readonly _arbolService = inject(ArbolService);

  @ViewChild('campoNombre') private campoNombre?: ElementRef<HTMLInputElement>;

  protected readonly profundidadMaxima = config.ProfundidadMaximaCarpetas;
  protected nombre = '';
  protected padreId: string | null = null;
  protected opciones: OpcionCarpeta[] = [];
  protected guardando = false;

  ngOnInit(): void {
    const modal = this.store.modalCarpeta();
    if (!modal) return;

    this.nombre = modal.carpeta?.name ?? '';
    // Vista previa de la regla de profundidad: solo ubicaciones donde la carpeta cabe
    this.opciones = this._arbolService.opcionesDePadre(this.store.carpetas(), modal.carpeta, this.profundidadMaxima);
    this.padreId = this.opciones.some(o => o.id === modal.padreId) ? modal.padreId : null;
  }

  ngAfterViewInit(): void {
    this.campoNombre?.nativeElement.focus();
  }

  protected async guardar() {
    if (!this.nombre.trim() || this.guardando) return;
    this.guardando = true;
    await this.store.guardarCarpeta(this.nombre, this.padreId);
    this.guardando = false;
  }
}
