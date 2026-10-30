import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { mensajeErrorHttp } from '../utils/api-errors';

function conMensaje(error: unknown, mensaje: string): unknown {
  if (error instanceof HttpErrorResponse) {
    try {
      (error as unknown as { message: string }).message = mensaje;
      return error;
    } catch {
      const copia = new HttpErrorResponse({
        error: error.error,
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url ?? undefined,
      });
      (copia as unknown as { message: string }).message = mensaje;
      return copia;
    }
  }

  if (error && typeof error === 'object') {
    try {
      (error as { message?: string }).message = mensaje;
      return error;
    } catch {
      return new Error(mensaje);
    }
  }

  return new Error(mensaje);
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => throwError(() => conMensaje(error, mensajeErrorHttp(error))))
  );
