// Producción: mismo origen; los rewrites de render.yaml reenvían /api/v1/auth a personal-notes-auth-services y
// el resto de /api a personal-notes-service. Así las cookies HttpOnly de la sesión son del propio sitio.
export const environment = {
  apiUrl: '/'
};
