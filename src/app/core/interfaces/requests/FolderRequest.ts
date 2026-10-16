export interface FolderRequest {
    name:           string;
    // null para crearla (o moverla) a la raíz
    parentFolderId: string | null;
}
