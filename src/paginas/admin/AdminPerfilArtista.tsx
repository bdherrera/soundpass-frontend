import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { guardarPerfilArtista, obtenerArtista, obtenerPerfilArtista } from '../../api/servicios/catalogo';
import { esNoDisponible, esNoEncontrado } from '../../api/cliente';
import { mensajeDeError } from '../../api/errores';
import type { PerfilArtista } from '../../api/tipos';
import { Aviso, AreaTexto, Boton, Cargando, SeccionNoDisponible, Tarjeta, Titulo } from '../../componentes/ui';
import { aLineas, deLineas, deRedes, esRutaRelativa, aRedes } from './textoLista';

function Formulario({ id, inicial }: { id: number; inicial: PerfilArtista | null }) {
  const clienteQuery = useQueryClient();
  const [biografia, setBiografia] = useState(inicial?.biografia ?? '');
  const [redes, setRedes] = useState(deRedes(inicial?.redes));
  const [enlaces, setEnlaces] = useState(deLineas(inicial?.enlaces));
  const [galeria, setGaleria] = useState(deLineas(inicial?.galeria));
  const rutasInvalidas = aLineas(galeria).filter((r) => !esRutaRelativa(r));
  const redesParseadas = aRedes(redes);

  const guardar = useMutation({
    mutationFn: () =>
      guardarPerfilArtista(id, {
        biografia: biografia.trim() || undefined,
        redes: redesParseadas.redes,
        enlaces: aLineas(enlaces),
        galeria: aLineas(galeria),
      }),
    onSuccess: (p) => clienteQuery.setQueryData(claves.perfilArtista(id), p),
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (rutasInvalidas.length === 0 && redesParseadas.errores.length === 0) guardar.mutate();
      }}
    >
      <AreaTexto etiqueta="Biografía" rows={6} value={biografia} onChange={(e) => setBiografia(e.target.value)} />
      <AreaTexto
        etiqueta="Redes sociales"
        ayuda="Una por línea, con el formato red: usuario o URL (p. ej. instagram: @banda)."
        error={redesParseadas.errores.length ? `Líneas sin "red: valor": ${redesParseadas.errores.join(', ')}` : undefined}
        value={redes}
        onChange={(e) => setRedes(e.target.value)}
      />
      <AreaTexto etiqueta="Enlaces" ayuda="Una URL por línea." value={enlaces} onChange={(e) => setEnlaces(e.target.value)} />
      <AreaTexto
        etiqueta="Galería"
        ayuda="Rutas relativas de imágenes, una por línea (p. ej. artistas/12/foto1.jpg)."
        error={rutasInvalidas.length ? `Deben ser rutas relativas sin "..", ":" ni "/" inicial: ${rutasInvalidas.join(', ')}` : undefined}
        value={galeria}
        onChange={(e) => setGaleria(e.target.value)}
      />
      {guardar.isSuccess && <Aviso tipo="exito">Perfil guardado.</Aviso>}
      {guardar.error && <Aviso tipo="error">{mensajeDeError(guardar.error)}</Aviso>}
      <Boton type="submit" cargando={guardar.isPending}>
        Guardar perfil
      </Boton>
    </form>
  );
}

export default function AdminPerfilArtista() {
  const id = Number(useParams().idArtista);
  const artista = useQuery({ queryKey: claves.artista(id), queryFn: () => obtenerArtista(id) });
  const perfil = useQuery({ queryKey: claves.perfilArtista(id), queryFn: () => obtenerPerfilArtista(id), staleTime: Infinity });

  let contenido;
  if (perfil.isPending) contenido = <Cargando />;
  else if (esNoDisponible(perfil.error)) contenido = <SeccionNoDisponible que="La edición del perfil" />;
  else if (perfil.error && !esNoEncontrado(perfil.error)) contenido = <Aviso tipo="error">{mensajeDeError(perfil.error)}</Aviso>;
  else contenido = <Formulario id={id} inicial={perfil.data ?? null} />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/artistas" className="text-sm text-marca-700 underline">
        ← Artistas
      </Link>
      <Titulo>Perfil de {artista.data?.nombreArtistico ?? `artista #${id}`}</Titulo>
      <Tarjeta>{contenido}</Tarjeta>
    </div>
  );
}
