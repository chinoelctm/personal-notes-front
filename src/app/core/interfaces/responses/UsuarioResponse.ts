// Usuario de la sesión. Los tokens nunca llegan al front: viajan en cookies HttpOnly
export interface UsuarioResponse {
  id: string;
  username: string;
  name: string;
}
