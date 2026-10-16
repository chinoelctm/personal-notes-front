export interface FolderResponse {
    id:             string;
    name:           string;
    // null si es una carpeta raíz
    parentFolderId: string | null;
    // Nivel en el árbol: 1 para una raíz
    depth:          number;
    // Nombres desde la raíz hasta esta carpeta (incluida)
    path:           string[];
    // Documentos activos directamente en la carpeta
    documentCount:  number;
    createdOn:      string;
    updatedOn:      string;
}
