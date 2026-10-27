const ERROR_TECNICO = /SQLSTATE|Integrity constraint|Duplicate entry|QueryException|foreign key constraint|Unknown column|doesn't exist/i;

export const MENSAJE_GUARDAR = 'No se pudo guardar. Intenta de nuevo.';

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

export function mensajeSeguro(mensaje: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  const texto = typeof mensaje === 'string' ? mensaje.trim() : '';
  if (!texto) return fallback;
  if (ERROR_TECNICO.test(texto)) {
    return 'No se pudo guardar. Verifique los datos e intente nuevamente.';
  }
  return texto;
}

export function mensajeError(e: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  return mensajeSeguro((e as { message?: unknown } | null)?.message, fallback);
}

export function erroresDe(e: unknown): Record<string, string> {
  const raw = (e as { errors?: unknown } | null)?.errors;
  if (!raw || typeof raw !== 'object') return {};

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([campo, mensajes]) => {
      const primero = Array.isArray(mensajes) ? mensajes[0] : mensajes;
      return [campo, mensajeSeguro(primero, 'Verifique este campo.')];
    })
  );
}
