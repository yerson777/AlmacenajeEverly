const ERROR_TECNICO = /SQLSTATE|Integrity constraint|Duplicate entry|QueryException|foreign key constraint|Unknown column|doesn't exist|Http failure response|Unknown Error|HttpErrorResponse|NetworkError|Failed to fetch|ERR_NETWORK|ECONNREFUSED|https?:\/\/|<html|<!doctype|Traceback|at\s+[\w.$]+\s+\(/i;

export const MENSAJE_SIN_CONEXION = 'Sin conexión a internet. Verifica tu red e inténtalo nuevamente.';
export const MENSAJE_TIMEOUT = 'La conexión tardó demasiado. Inténtalo nuevamente.';
export const MENSAJE_SERVIDOR = 'Ocurrió un problema en el servidor. Inténtalo más tarde.';
export const MENSAJE_GUARDAR = 'No se pudo guardar. Intenta de nuevo.';

const MENSAJE_INESPERADO = 'Ocurrió un error inesperado.';
const MENSAJE_GENERICO = 'No se pudo completar la solicitud. Inténtalo nuevamente.';

interface ErrorHttpLike {
  status?: number;
  name?: string;
  message?: unknown;
  error?: unknown;
}

export interface EstadoErroresFormulario {
  errorModal: string;
  errores: Record<string, string>;
  intentado: boolean;
  guardando: boolean;
}

export function aplicarErrorFormulario(e: unknown, estado: EstadoErroresFormulario): void {
  const errores = erroresDe(e);
  estado.errores = errores;
  estado.intentado = Object.keys(errores).length > 0;
  estado.errorModal = mensajeError(e, MENSAJE_GUARDAR);
  estado.guardando = false;
}

function primerMensaje(valor: unknown): string | null {
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const mensaje = primerMensaje(item);
      if (mensaje) return mensaje;
    }
    return null;
  }
  if (typeof valor === 'string' && valor.trim()) return valor.trim();
  return null;
}

function mensajeBackend(e: unknown): string | null {
  if (typeof e === 'string') return primerMensaje(e);
  if (!e || typeof e !== 'object') return null;

  const body = (e as ErrorHttpLike).error;
  if (typeof body === 'string') return primerMensaje(body);
  if (!body || typeof body !== 'object') return null;

  const datos = body as { message?: unknown; errors?: unknown };
  if (datos.errors && typeof datos.errors === 'object') {
    for (const valor of Object.values(datos.errors as Record<string, unknown>)) {
      const mensaje = primerMensaje(valor);
      if (mensaje) return mensaje;
    }
  }
  return primerMensaje(datos.message);
}

function esTimeout(e: unknown, texto: string): boolean {
  const error = e as ErrorHttpLike | null;
  return error?.status === 408 || error?.name === 'TimeoutError' || /timeout|timed out/i.test(texto);
}

export function mensajeSeguro(mensaje: unknown, fallback = MENSAJE_INESPERADO): string {
  const texto = typeof mensaje === 'string' ? mensaje.trim() : '';
  if (!texto) return fallback;
  if (ERROR_TECNICO.test(texto)) return fallback;
  return texto;
}

export function mensajeErrorHttp(e: unknown, fallback = MENSAJE_GENERICO): string {
  if (typeof e === 'string') return mensajeSeguro(e, fallback);
  if (!e || typeof e !== 'object') return fallback;

  const error = e as ErrorHttpLike;
  const status = error.status;
  const texto = typeof error.message === 'string' ? error.message : '';
  const sinConexion = typeof navigator !== 'undefined' && navigator.onLine === false;

  if (status === 0 || sinConexion) return MENSAJE_SIN_CONEXION;
  if (typeof status === 'number' && status >= 500) return MENSAJE_SERVIDOR;
  if (esTimeout(e, texto)) return MENSAJE_TIMEOUT;

  const backend = mensajeBackend(e);
  if (backend) return mensajeSeguro(backend, fallback);

  if (typeof status !== 'number' && /Http failure response|Unknown Error|NetworkError|Failed to fetch|ERR_NETWORK/i.test(texto)) {
    return MENSAJE_SIN_CONEXION;
  }

  return mensajeSeguro(texto, fallback);
}

export function mensajeError(e: unknown, fallback = MENSAJE_INESPERADO): string {
  return mensajeErrorHttp(e, fallback);
}

export function erroresDe(e: unknown): Record<string, string> {
  const raw = (e as { errors?: unknown } | null)?.errors;
  const bodyErrors = (e as { error?: { errors?: unknown } } | null)?.error?.errors;
  const origen = raw && typeof raw === 'object' ? raw : bodyErrors;
  if (!origen || typeof origen !== 'object') return {};

  return Object.fromEntries(
    Object.entries(origen as Record<string, unknown>).map(([campo, mensajes]) => {
      const primero = Array.isArray(mensajes) ? mensajes[0] : mensajes;
      return [campo, mensajeSeguro(primero, 'Verifique este campo.')];
    })
  );
}
