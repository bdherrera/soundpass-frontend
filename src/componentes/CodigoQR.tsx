import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** QR generado en el navegador a partir del código UUID de la entrada (SVG, no necesita canvas). */
export function CodigoQR({ valor, tamano = 160, apagado = false }: { valor: string; tamano?: number; apagado?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    QRCode.toString(valor, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 })
      .then((svg) => {
        if (vigente) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        if (vigente) setSrc(null);
      });
    return () => {
      vigente = false;
    };
  }, [valor]);

  return (
    <figure className="flex flex-col items-center gap-1">
      {src ? (
        <img
          src={src}
          width={tamano}
          height={tamano}
          alt={`Código QR de la entrada ${valor}`}
          className={`rounded bg-white ${apagado ? 'opacity-40 grayscale' : ''}`}
        />
      ) : (
        <div style={{ width: tamano, height: tamano }} className="animate-pulse rounded bg-slate-200" aria-hidden="true" />
      )}
      <figcaption className="break-all text-center font-mono text-[11px] text-slate-600">{valor}</figcaption>
    </figure>
  );
}
