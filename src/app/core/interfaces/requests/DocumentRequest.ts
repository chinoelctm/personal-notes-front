import { DocumentType, Priority } from '../responses/DocumentResponse';

export interface DocumentRequest {
    folderId: string;
    // Vacío se publica como "Sin título"
    title:    string;
    content:  string;
    priority: Priority;
    type:     DocumentType;
}
