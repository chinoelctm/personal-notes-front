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
 * Con "Buscar en todas mis notas" la API le entrega a la IA el catálogo y el contenido relevante de los
 * documentos; con un documento adjunto, su texto (aunque sea un borrador) va además como contexto.
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
  readonly buscarEnNotas = signal(true);

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
    const texto = this._vistaPrevia.textoDe(borrador.content, borrador.type).slice(0, config.LargoMaximoContextoIa);
    const titulo = borrador.title.trim() || 'Sin título';
    this.contexto.set({ titulo, texto, documentoId: borrador.documentoId });
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
        context: contexto ? { title: contexto.titulo, text: contexto.texto, documentId: contexto.documentoId } : null,
        history: historial,
        searchNotes: this.buscarEnNotas()
      });
      const fuentes = respuesta.sources.map(s => ({ id: s.id, titulo: s.title, ruta: s.path }));
      this.mensajes.update(m => [...m, { rol: 'asistente', texto: respuesta.answer, fuentes }]);
    } catch (error) {
      this.mensajes.update(m => [...m, { rol: 'error', texto: mensajeDeError(error) }]);
    } finally {
      this.pensando.set(false);
    }
  }
}
