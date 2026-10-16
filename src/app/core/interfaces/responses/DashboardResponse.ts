export interface PriorityCounts {
    high:   number;
    medium: number;
    low:    number;
    none:   number;
}

export interface DashboardResponse {
    totalDocuments:    number;
    totalFolders:      number;
    byPriority:        PriorityCounts;
    // Documentos editados dentro de las últimas recentWindowHours horas
    recentlyEdited:    number;
    recentWindowHours: number;
    // UTC; null si no hay documentos
    lastEditedOn:      string | null;
}
