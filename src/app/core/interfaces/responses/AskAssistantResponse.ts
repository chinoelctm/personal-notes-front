// Documento cuyo contenido usó la IA para responder
export interface AssistantSourceResponse {
    id:    string;
    title: string;
    // Ruta de la carpeta ("Trabajo / Sprints Q3")
    path:  string;
}

export interface AskAssistantResponse {
    answer:  string;
    // Modelo que respondió (ej. gemini-3.8-flash)
    model:   string;
    sources: AssistantSourceResponse[];
}
