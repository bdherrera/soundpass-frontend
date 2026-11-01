import { useCallback, useState } from 'react';
import { nuevoUuid } from './formato';

const prefijo = 'soundpass.compra.';

function leer(clave: string): string | null {
  try {
    return sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: string | null) {
  try {
    if (valor) sessionStorage.setItem(clave, valor);
    else sessionStorage.removeItem(clave);
  } catch {
    // Sin sessionStorage la clave vive solo mientras la pantalla esté abierta.
  }
}

/**
 * Clave de idempotencia de una compra. Se genera al abrir el checkout y se reutiliza en cada reintento
 * (incluso tras recargar la pestaña) hasta que la compra termina bien; solo entonces `nuevaCompra()` crea otra.
 * Reintentar con la misma clave es seguro: si la compra falló, la clave quedó libre; si llegó a crearse,
 * el servidor devuelve la orden existente en lugar de vender de nuevo.
 */
export function useClaveIdempotencia(idEvento: number) {
  const almacen = `${prefijo}${idEvento}`;
  const [clave, setClave] = useState(() => {
    const guardada = leer(almacen);
    if (guardada) return guardada;
    const nueva = nuevoUuid();
    escribir(almacen, nueva);
    return nueva;
  });

  const nuevaCompra = useCallback(() => {
    const nueva = nuevoUuid();
    escribir(almacen, nueva);
    setClave(nueva);
  }, [almacen]);

  return { clave, nuevaCompra };
}
