import { computed, inject, Injectable, signal } from '@angular/core';
import config from '../../../assets/config/config.json';
import { AssistantService } from '../http/assistant.service';
import { VistaPreviaService } from '../utils/vista-previa.service';
import { mensajeDeError } from '../utils/api-error';
import { ContextoDocumento, MensajeChat, SugerenciaIa } from '../interfaces/Asistente';
import { ChatMessageRequest } from '../interfaces/requests/AskAssistantRequest';
import { AssistantStatusResponse } from '../interfaces/responses/AssistantStatusResponse';
import { Borrador } from '../interfaces/Notas';

/**
 * Chat con el asistente de IA a través de la API (que guarda la API Key de Gemini en su configuración).
 * Con un documento adjunto, su texto se envía automáticamente como contexto de cada pregunta.
 */
@Injectable({
  providedIn: 'root'
})
export class AsistenteStore {

  private readonly _assistantService = inject(AssistantService);
  private readonly _vistaPrevia = inject(VistaPreviaService);

  readonly sugerencias: SugerenciaIa[] = config.SugerenciasIa;

  readonly abierto = signal(false);
  readonly estado = signal<AssistantStatusResponse | null>(null);
  readonly mensajes = signal<MensajeChat[]>([]);
  readonly pensando = signal(false);
  readonly contexto = signal<ContextoDocumento | null>(null);

  // Mientras no se sepa el estado se permite preguntar: la API responde 503 si falta la clave
  readonly disponible = computed(() => this.estado()?.configured ?? true);

  async abrir() {
    this.abierto.set(true);
    await this.cargarEstado();
  }

  cerrar() {
    this.abierto.set(false);
  }

  async cargarEstado() {
    try {
      this.estado.set(await this._assistantService.obtenerEstado());
    } catch {
      this.estado.set(null);
    }
  }

  /** "Preguntar sobre este documento": adjunta el texto del documento activo y abre el panel. */
  preguntarSobreDocumento(borrador: Borrador) {
    const texto = this._vistaPrevia.textoPlano(borrador.content).slice(0, config.LargoMaximoContextoIa);
    const titulo = borrador.title.trim() || 'Sin título';
    this.contexto.set({ titulo, texto });
    this.mensajes.update(m => [...m, { rol: 'sistema', texto: `Documento adjunto como contexto: "${titulo}"` }]);
    this.abrir();
  }

  quitarContexto() {
    this.contexto.set(null);
  }

  limpiarChat() {
    this.mensajes.set([]);
  }

  async enviar(pregunta: string) {
    const texto = pregunta.trim();
    if (!texto || this.pensando()) return;

    const historial: ChatMessageRequest[] = this.mensajes()
      .filter(m => m.rol === 'usuario' || m.rol === 'asistente')
      .map(m => ({ role: m.rol === 'usuario' ? 'User' : 'Assistant', text: m.texto }));
    const contexto = this.contexto();

    this.mensajes.update(m => [...m, { rol: 'usuario', texto }]);
    this.pensando.set(true);

    try {
      const respuesta = await this._assistantService.preguntar({
        question: texto,
        context: contexto ? { title: contexto.titulo, text: contexto.texto } : null,
        history: historial
      });
      this.mensajes.update(m => [...m, { rol: 'asistente', texto: respuesta.answer }]);
    } catch (error) {
      this.mensajes.update(m => [...m, { rol: 'error', texto: mensajeDeError(error) }]);
    } finally {
      this.pensando.set(false);
    }
  }
}
