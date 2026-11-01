import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { hacerCheckin } from '../../api/servicios/entradas';
import { mensajeDeError } from '../../api/errores';
import { Aviso, Boton, Campo, Tarjeta, Titulo } from '../../componentes/ui';
import { fechaHora } from '../../lib/formato';

// BarcodeDetector aún no está en los tipos de TypeScript.
interface CodigoDetectado {
  rawValue: string;
}
interface Detector {
  detect(fuente: CanvasImageSource): Promise<CodigoDetectado[]>;
}
type ConstructorDetector = new (opciones?: { formats: string[] }) => Detector;

function constructorDetector(): ConstructorDetector | null {
  const w = window as unknown as { BarcodeDetector?: ConstructorDetector };
  return typeof w.BarcodeDetector === 'function' ? w.BarcodeDetector : null;
}

const uuid = z.string().trim().uuid();

const MENSAJES = {
  NO_ENCONTRADO: 'No existe una entrada con ese código.',
  TRANSICION_INVALIDA:
    'La entrada no admite check-in: ya fue usada, está cancelada, su evento no está publicado o no tiene asistente registrado.',
  VALIDACION: 'El código no tiene un formato válido.',
};

function Escaner({ alLeer }: { alLeer: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flujo = useRef<MediaStream | null>(null);

  const detener = useCallback(() => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
    setActivo(false);
  }, []);

  useEffect(() => detener, [detener]);

  useEffect(() => {
    if (!activo) return;
    const Ctor = constructorDetector();
    if (!Ctor) return;
    const detector = new Ctor({ formats: ['qr_code'] });
    let vivo = true;
    const ciclo = async () => {
      if (!vivo || !video.current) return;
      try {
        if (video.current.readyState >= 2) {
          const [primero] = await detector.detect(video.current);
          if (primero?.rawValue) {
            detener();
            alLeer(primero.rawValue);
            return;
          }
        }
      } catch {
        // Un fotograma que no se pudo analizar no detiene el escaneo.
      }
      setTimeout(ciclo, 250);
    };
    ciclo();
    return () => {
      vivo = false;
    };
  }, [activo, alLeer, detener]);

  if (!constructorDetector()) {
    return <p className="text-sm text-slate-600">Este navegador no puede leer códigos con la cámara; escribe el código abajo.</p>;
  }

  const iniciar = async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      flujo.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play();
      }
      setActivo(true);
    } catch {
      setError('No se pudo abrir la cámara. Revisa los permisos o usa la entrada manual.');
    }
  };

  return (
    <div className="space-y-3">
      <video ref={video} muted playsInline className={`aspect-video w-full rounded-lg bg-black object-cover ${activo ? '' : 'hidden'}`} aria-label="Vista de la cámara" />
      {activo ? (
        <Boton variante="secundario" onClick={detener}>
          Detener cámara
        </Boton>
      ) : (
        <Boton onClick={iniciar}>Escanear con la cámara</Boton>
      )}
      {error && <Aviso tipo="alerta">{error}</Aviso>}
    </div>
  );
}

export default function AdminCheckin() {
  const [codigo, setCodigo] = useState('');
  const [errorFormato, setErrorFormato] = useState<string | null>(null);
  const checkin = useMutation({ mutationFn: hacerCheckin });
  const entrada = useRef<HTMLInputElement>(null);
  const { mutate } = checkin;

  const enviar = useCallback(
    (valor: string) => {
      const v = valor.trim();
      setCodigo(v);
      if (!uuid.safeParse(v).success) {
        setErrorFormato('El código debe ser un UUID (p. ej. 3f2a6c1e-9d3b-4c55-8a77-0c1d2e3f4a5b).');
        return;
      }
      setErrorFormato(null);
      mutate(v);
    },
    [mutate],
  );

  const siguiente = () => {
    checkin.reset();
    setCodigo('');
    entrada.current?.focus();
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Titulo>Check-in</Titulo>
      <Tarjeta>
        <Escaner alLeer={enviar} />
      </Tarjeta>
      <Tarjeta>
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(codigo);
          }}
        >
          <Campo
            ref={entrada}
            etiqueta="Código de la entrada"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            value={codigo}
            error={errorFormato ?? undefined}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Boton type="submit" cargando={checkin.isPending} disabled={!codigo.trim()}>
            Registrar ingreso
          </Boton>
        </form>
      </Tarjeta>

      <div aria-live="assertive">
        {checkin.isSuccess && (
          <Aviso tipo="exito" titulo="Ingreso registrado">
            <p>
              Entrada #{checkin.data.idEntrada} · {checkin.data.estado} · {fechaHora(checkin.data.fechaCheckin)}
            </p>
          </Aviso>
        )}
        {checkin.isError && (
          <Aviso tipo="error" titulo="No se registró el ingreso">
            {mensajeDeError(checkin.error, MENSAJES)}
          </Aviso>
        )}
        {(checkin.isSuccess || checkin.isError) && (
          <Boton variante="secundario" className="mt-3" onClick={siguiente}>
            Siguiente entrada
          </Boton>
        )}
      </div>
    </div>
  );
}
