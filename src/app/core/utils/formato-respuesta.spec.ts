import { formatearRespuesta } from './formato-respuesta';

describe('formatearRespuesta', () => {
  it('convierte negritas sin interpretar HTML', () => {
    expect(formatearRespuesta('Monto **650.000 CLP** <b>x</b>')).toEqual([
      {
        marcador: null, segmentos: [
          { texto: 'Monto ', negrita: false },
          { texto: '650.000 CLP', negrita: true },
          { texto: ' <b>x</b>', negrita: false }
        ]
      }
    ]);
  });

  it('reconoce viñetas, listas numeradas y encabezados', () => {
    const lineas = formatearRespuesta('## Datos\n* **Vence:** 31 de marzo\n- Garantía: 1 mes\n2. Paso dos');

    expect(lineas.map(l => l.marcador)).toEqual([null, '•', '•', '2.']);
    expect(lineas[0].segmentos).toEqual([{ texto: 'Datos', negrita: true }]);
    expect(lineas[1].segmentos[0]).toEqual({ texto: 'Vence:', negrita: true });
    expect(lineas[3].segmentos).toEqual([{ texto: 'Paso dos', negrita: false }]);
  });
});
