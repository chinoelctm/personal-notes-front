// Formato de error que devuelve la API (RFC 7807)
export interface ProblemDetails {
    title?:  string;
    status?: number;
    detail?: string;
    errors?: Record<string, string[]>;
}
