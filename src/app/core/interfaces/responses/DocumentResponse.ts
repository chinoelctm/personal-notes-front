// Banderita de prioridad: la API la envía y recibe como texto
export type Priority = 'None' | 'Low' | 'Medium' | 'High';

export interface DocumentResponse {
    id:        string;
    folderId:  string;
    title:     string;
    // HTML del editor (puede incluir imágenes en Base64)
    content:   string;
    priority:  Priority;
    // Fechas ISO en UTC
    createdOn: string;
    updatedOn: string;
}
