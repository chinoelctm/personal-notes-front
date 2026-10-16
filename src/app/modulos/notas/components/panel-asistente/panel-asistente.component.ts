import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotasStore } from '../../../../core/state/notas.store';
import { AsistenteStore } from '../../../../core/state/asistente.store';
import { IconoComponent } from '../../../../shared/icono/icono.component';

@Component({
  selector: 'app-panel-asistente',
  standalone: true,
  imports: [FormsModule, IconoComponent],
  templateUrl: './panel-asistente.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelAsistenteComponent {

  protected readonly store = inject(NotasStore);
  protected readonly asistente = inject(AsistenteStore);

  @ViewChild('conversacion') private conversacion?: ElementRef<HTMLDivElement>;

  protected pregunta = '';

  constructor() {
    // Con cada mensaje nuevo (o el "Pensando..."), la conversación baja hasta el final
    effect(() => {
      this.asistente.mensajes();
      this.asistente.pensando();
      setTimeout(() => {
        const elemento = this.conversacion?.nativeElement;
        if (elemento) elemento.scrollTop = elemento.scrollHeight;
      });
    });
  }

  protected adjuntarDocumentoActivo() {
    const borrador = this.store.borrador();
    if (borrador) this.asistente.preguntarSobreDocumento(borrador);
  }

  protected async enviar(texto: string) {
    if (!texto.trim()) return;
    this.pregunta = '';
    await this.asistente.enviar(texto);
  }
}
