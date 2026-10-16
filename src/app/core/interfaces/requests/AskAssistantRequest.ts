export type ChatRole = 'User' | 'Assistant';

export interface ChatMessageRequest {
    role: ChatRole;
    text: string;
}

export interface AskAssistantRequest {
    question: string;
    // Documento activo como contexto (texto plano); null para una pregunta general
    context:  { title: string; text: string } | null;
    // Mensajes previos de la conversación (la API usa los últimos 10)
    history:  ChatMessageRequest[];
}
