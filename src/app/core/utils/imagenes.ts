/**
 * Lee una imagen local como data URL (Base64) para incrustarla en la nota. Rechaza archivos que no sean
 * imágenes o que superen el tamaño máximo, porque cada imagen viaja dentro del HTML del documento.
 */
export function leerImagenComoBase64(archivo: File, tamanoMaximoMb: number): Promise<string> {
  if (!archivo.type.startsWith('image/')) {
    return Promise.reject(new Error(`"${archivo.name}" no es una imagen.`));
  }
  if (archivo.size > tamanoMaximoMb * 1024 * 1024) {
    return Promise.reject(new Error(`La imagen supera los ${tamanoMaximoMb} MB; usa una más liviana.`));
  }

  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error(`No se pudo leer "${archivo.name}".`));
    lector.readAsDataURL(archivo);
  });
}
