export interface DiaActividad {
  // AAAA-MM-DD en la hora local del navegador
  fecha:    string;
  // "lun", "mar"… para el eje del gráfico
  etiqueta: string;
  cantidad: number;
  esHoy:    boolean;
}

const MS_DIA = 24 * 60 * 60 * 1000;

function claveLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function ultimosDias(dias: number, ahora: Date): Date[] {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Array.from({ length: dias }, (_, i) => new Date(hoy.getTime() - (dias - 1 - i) * MS_DIA));
}

/**
 * Cuántas fechas caen en cada uno de los últimos `dias` días (hoy incluido, el último). Se usa con la fecha de
 * última edición de cada documento: la API no guarda el historial, así que es "documentos editados por última
 * vez ese día".
 */
export function actividadPorDia(fechasIso: string[], dias: number, ahora: Date = new Date()): DiaActividad[] {
  const conteo = new Map<string, number>();
  for (const iso of fechasIso) {
    const instante = Date.parse(iso);
    if (Number.isNaN(instante)) continue;
    const clave = claveLocal(new Date(instante));
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }

  const hoy = claveLocal(ahora);
  return ultimosDias(dias, ahora).map(dia => {
    const fecha = claveLocal(dia);
    return {
      fecha,
      etiqueta: dia.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', ''),
      cantidad: conteo.get(fecha) ?? 0,
      esHoy: fecha === hoy
    };
  });
}

/** Total acumulado al cierre de cada uno de los últimos `dias` días, a partir de las fechas de creación. */
export function totalAcumulado(fechasCreacionIso: string[], dias: number, ahora: Date = new Date()): number[] {
  const instantes = fechasCreacionIso.map(f => Date.parse(f)).filter(n => !Number.isNaN(n));
  return ultimosDias(dias, ahora).map(dia => {
    const finDelDia = dia.getTime() + MS_DIA;
    return instantes.filter(t => t < finDelDia).length;
  });
}
