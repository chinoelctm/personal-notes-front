// Respuesta de publicar (crear o actualizar) un documento
export interface DocumentSavedResponse {
    id:        string;
    // Fecha de publicación asignada por la API (UTC)
    updatedOn: string;
}
