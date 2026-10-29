import { actividadPorDia, totalAcumulado } from './actividad';

describe('actividad', () => {
  // Mediodía local del 29 de octubre: las fechas de prueba se arman en hora local para no depender de la zona
  const ahora = new Date(2026, 9, 29, 12, 0, 0);
  const local = (dia: number, hora = 10) => new Date(2026, 9, dia, hora, 0, 0).toISOString();

  it('cuenta las ediciones por día local y marca hoy como el último', () => {
    const serie = actividadPorDia([local(29), local(29, 23), local(27), local(10), 'no-es-fecha'], 7, ahora);

    expect(serie.length).toBe(7);
    expect(serie.at(-1)).toEqual(jasmine.objectContaining({ fecha: '2026-10-29', cantidad: 2, esHoy: true }));
    expect(serie.find(d => d.fecha === '2026-10-27')?.cantidad).toBe(1);
    // El 10 de octubre queda fuera de la ventana de 7 días
    expect(serie.reduce((s, d) => s + d.cantidad, 0)).toBe(3);
    expect(serie[0].fecha).toBe('2026-10-23');
  });

  it('acumula el total de documentos al cierre de cada día', () => {
    const serie = totalAcumulado([local(1), local(24), local(29), local(29)], 7, ahora);

    expect(serie).toEqual([1, 2, 2, 2, 2, 2, 4]);
  });
});
