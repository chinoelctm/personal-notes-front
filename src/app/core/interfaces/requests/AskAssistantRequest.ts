export type ChatRole = 'User' | 'Assistant';

export interface ChatMessageRequest {
    role: ChatRole;
    text: string;
}

export interface AskAssistantRequest {
    question: string;
    // Documento activo como contexto (texto plano); null para una pregunta general
    context:  { title: string; text: string; documentId: string | null } | null;
    // Mensajes previos de la conversación (la API usa los últimos 10)
    history:  ChatMessageRequest[];
    // true: la API envía a la IA el catálogo y el contenido relevante de todas las notas
    searchNotes: boolean;
}
