// Banderita de prioridad: la API la envía y recibe como texto
export type Priority = 'None' | 'Low' | 'Medium' | 'High';

// Rich: nota del editor enriquecido. Html: página HTML propia que se muestra en un iframe aislado
export type DocumentType = 'Rich' | 'Html';

export interface DocumentResponse {
    id:        string;
    folderId:  string;
    title:     string;
    // HTML del editor (Rich) o código de la página (Html)
    content:   string;
    priority:  Priority;
    type:      DocumentType;
    // Fechas ISO en UTC
    createdOn: string;
    updatedOn: string;
}
