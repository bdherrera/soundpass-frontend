import { Link } from 'react-router-dom';
import { Aviso } from './ui';

export function SinPermiso() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Aviso tipo="error" titulo="No tienes permiso">
        <p>Tu cuenta no puede acceder a esta sección.</p>
        <Link to="/" className="mt-2 inline-block font-medium text-marca-700 underline">
          Volver al catálogo
        </Link>
      </Aviso>
    </div>
  );
}
