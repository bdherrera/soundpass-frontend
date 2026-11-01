import { Link } from 'react-router-dom';
import { Titulo } from '../../componentes/ui';

const SECCIONES = [
  { a: '/admin/eventos', t: 'Eventos', d: 'Crear, editar, publicar; artistas, tipos de entrada, cola y ventas.' },
  { a: '/admin/artistas', t: 'Artistas', d: 'Catálogo de artistas y su perfil ampliado.' },
  { a: '/admin/escenarios', t: 'Escenarios', d: 'Lugares, ciudades y capacidad.' },
  { a: '/admin/checkin', t: 'Check-in', d: 'Escanear o escribir el código de una entrada.' },
  { a: '/admin/logs', t: 'Logs', d: 'Registro de la aplicación por nivel.' },
];

export default function AdminInicio() {
  return (
    <>
      <Titulo>Administración</Titulo>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECCIONES.map((s) => (
          <li key={s.a}>
            <Link
              to={s.a}
              className="block h-full rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-marca-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
            >
              <h2 className="text-lg font-semibold text-marca-800">{s.t}</h2>
              <p className="mt-1 text-sm text-slate-700">{s.d}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
