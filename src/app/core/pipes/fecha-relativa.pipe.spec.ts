import { FechaRelativaPipe } from './fecha-relativa.pipe';

describe('FechaRelativaPipe', () => {
  const pipe = new FechaRelativaPipe();
  const ahora = Date.parse('2026-10-16T12:00:00Z');

  it('muestra el tiempo transcurrido desde la fecha UTC', () => {
    expect(pipe.transform('2026-10-16T11:59:30Z', ahora)).toBe('Hace un momento');
    expect(pipe.transform('2026-10-16T11:45:00Z', ahora)).toBe('Hace 15 min');
    expect(pipe.transform('2026-10-16T06:00:00Z', ahora)).toBe('Hace 6 h');
    expect(pipe.transform('2026-10-15T06:00:00Z', ahora)).toBe('Ayer');
    expect(pipe.transform('2026-10-13T12:00:00Z', ahora)).toBe('Hace 3 días');
  });

  it('devuelve un guion si la fecha no es válida', () => {
    expect(pipe.transform(null, ahora)).toBe('-');
    expect(pipe.transform('no-es-fecha', ahora)).toBe('-');
  });
});
