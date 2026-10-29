import { Priority } from '../interfaces/responses/DocumentResponse';

export interface EstiloPrioridad {
    etiqueta: string;
    // Punto de color de la banderita
    punto:    string;
    // Insignia (fondo, texto y borde)
    insignia: string;
    // Degradado de color de la tarjeta de vidrio (from-…)
    tinte:    string;
}

// Banderitas: Alta (roja), Media (amarilla), Baja (verde), Ninguna (gris)
export const PRIORIDADES: Record<Priority, EstiloPrioridad> = {
    High: {
        etiqueta: 'Alta',
        punto: 'bg-rose-500',
        insignia: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
        tinte: 'from-rose-500/[0.16]'
    },
    Medium: {
        etiqueta: 'Media',
        punto: 'bg-amber-500',
        insignia: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        tinte: 'from-amber-400/[0.18]'
    },
    Low: {
        etiqueta: 'Baja',
        punto: 'bg-emerald-500',
        insignia: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        tinte: 'from-emerald-500/[0.15]'
    },
    None: {
        etiqueta: 'Ninguna',
        punto: 'bg-slate-300 dark:bg-slate-500',
        insignia: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
        tinte: 'from-indigo-500/[0.08]'
    }
};

// Orden del menú y de los filtros: de mayor a menor
export const ORDEN_PRIORIDADES: Priority[] = ['High', 'Medium', 'Low', 'None'];
