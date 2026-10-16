// La API Key vive solo en el servidor: aquí solo se informa si está configurada
export interface AssistantStatusResponse {
    configured: boolean;
    provider:   string;
    model:      string;
}
