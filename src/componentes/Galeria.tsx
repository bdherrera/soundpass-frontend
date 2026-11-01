import { esVideo, urlMedio } from '../lib/formato';

/** Galería de rutas relativas (imágenes o videos) resueltas contra VITE_MEDIA_URL. */
export function Galeria({ rutas, titulo }: { rutas: string[]; titulo: string }) {
  if (rutas.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={titulo}>
      {rutas.map((ruta, i) => (
        <li key={`${ruta}-${i}`} className="overflow-hidden rounded-lg bg-slate-200">
          {esVideo(ruta) ? (
            <video src={urlMedio(ruta)} controls preload="metadata" className="aspect-video w-full object-cover">
              <track kind="captions" />
            </video>
          ) : (
            <img
              src={urlMedio(ruta)}
              alt={`${titulo} ${i + 1}`}
              loading="lazy"
              className="aspect-square w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
