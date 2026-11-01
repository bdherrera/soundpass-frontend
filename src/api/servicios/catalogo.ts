import { pedir } from '../cliente';
import type {
  Artista,
  ArtistaEntrada,
  Escenario,
  EscenarioEntrada,
  Pagina,
  ParametrosPagina,
  PerfilArtista,
  PerfilArtistaEntrada,
} from '../tipos';

export interface FiltrosArtistas extends ParametrosPagina {
  genero?: string;
  pais?: string;
}

export const listarArtistas = (filtros: FiltrosArtistas = {}) =>
  pedir<Pagina<Artista>>('/artistas', { query: { ...filtros } });
export const obtenerArtista = (id: number) => pedir<Artista>(`/artistas/${id}`);
export const crearArtista = (datos: ArtistaEntrada) =>
  pedir<Artista>('/artistas', { metodo: 'POST', cuerpo: datos });
export const actualizarArtista = (id: number, datos: ArtistaEntrada) =>
  pedir<Artista>(`/artistas/${id}`, { metodo: 'PUT', cuerpo: datos });
export const desactivarArtista = (id: number) => pedir<void>(`/artistas/${id}`, { metodo: 'DELETE' });

export const obtenerPerfilArtista = (id: number) => pedir<PerfilArtista>(`/artistas/${id}/perfil`);
export const guardarPerfilArtista = (id: number, datos: PerfilArtistaEntrada) =>
  pedir<PerfilArtista>(`/artistas/${id}/perfil`, { metodo: 'PUT', cuerpo: datos });

export interface FiltrosEscenarios extends ParametrosPagina {
  ciudad?: string;
}

export const listarEscenarios = (filtros: FiltrosEscenarios = {}) =>
  pedir<Pagina<Escenario>>('/escenarios', { query: { ...filtros } });
export const obtenerEscenario = (id: number) => pedir<Escenario>(`/escenarios/${id}`);
export const crearEscenario = (datos: EscenarioEntrada) =>
  pedir<Escenario>('/escenarios', { metodo: 'POST', cuerpo: datos });
export const actualizarEscenario = (id: number, datos: EscenarioEntrada) =>
  pedir<Escenario>(`/escenarios/${id}`, { metodo: 'PUT', cuerpo: datos });
export const desactivarEscenario = (id: number) => pedir<void>(`/escenarios/${id}`, { metodo: 'DELETE' });
