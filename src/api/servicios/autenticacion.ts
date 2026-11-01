import { pedir } from '../cliente';
import type { LoginSolicitud, RegistroSolicitud, TokenRespuesta, Usuario } from '../tipos';

export const registrarUsuario = (datos: RegistroSolicitud) =>
  pedir<Usuario>('/auth/registro', { metodo: 'POST', cuerpo: datos, sin401Global: true });

export const iniciarSesion = (datos: LoginSolicitud) =>
  pedir<TokenRespuesta>('/auth/login', { metodo: 'POST', cuerpo: datos, sin401Global: true });
