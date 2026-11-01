// Alias legibles de los esquemas generados desde docs/openapi.yaml (npm run gen:api).
import type { components } from './schema';

type S = components['schemas'];

export type ErrorApiCuerpo = S['Error'];
export type CodigoError = S['Error']['codigo'];
export type DetalleValidacion = NonNullable<S['Error']['detalles']>[number];

export type RegistroSolicitud = S['RegistroSolicitud'];
export type LoginSolicitud = S['LoginSolicitud'];
export type TokenRespuesta = S['TokenRespuesta'];
export type Usuario = S['Usuario'];
export type Rol = Usuario['rol'];

export type ArtistaEntrada = S['ArtistaEntrada'];
export type Artista = S['Artista'];
export type EscenarioEntrada = S['EscenarioEntrada'];
export type Escenario = S['Escenario'];

export type EstadoEvento = S['EstadoEvento'];
export type EventoEntrada = S['EventoEntrada'];
export type Evento = S['Evento'];
export type EventoDetalle = S['EventoDetalle'];
export type ArtistaEnEvento = S['ArtistaEnEvento'];
export type AsignacionArtista = S['AsignacionArtista'];

export type TipoEntradaEntrada = S['TipoEntradaEntrada'];
export type TipoEntrada = S['TipoEntrada'];
export type Disponibilidad = S['Disponibilidad'];
export type ResumenVentas = S['ResumenVentas'];

export type ColaConfig = S['ColaConfig'];
export type ColaEstado = S['ColaEstado'];
export type Turno = S['Turno'];
export type EstadoTurno = Turno['estado'];

export type LogEntrada = S['LogEntrada'];
export type NivelLog = LogEntrada['nivel'];

export type LineaCompra = S['LineaCompra'];
export type CompraSolicitud = S['CompraSolicitud'];
export type EstadoOrden = S['EstadoOrden'];
export type DetalleCompra = S['DetalleCompra'];
export type Orden = S['Orden'];

export type EstadoEntrada = S['EstadoEntrada'];
export type Entrada = S['Entrada'];
export type AsistenteEntrada = S['AsistenteEntrada'];
export type Asistente = S['Asistente'];
export type CheckinRespuesta = S['CheckinRespuesta'];

export type ResenaEntrada = S['ResenaEntrada'];
export type Resena = S['Resena'];
export type ResumenResenas = S['ResumenResenas'];

export type PerfilArtistaEntrada = S['PerfilArtistaEntrada'];
export type PerfilArtista = S['PerfilArtista'];
export type DetalleEventoEntrada = S['DetalleEventoEntrada'];
export type DetalleEvento = S['DetalleEvento'];

/** Objeto `Pagina` de la API con su contenido. */
export type Pagina<T> = S['Pagina'] & { contenido: T[] };

export interface ParametrosPagina {
  pagina?: number;
  tamano?: number;
}
