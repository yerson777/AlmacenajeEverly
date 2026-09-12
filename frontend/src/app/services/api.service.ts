import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Bolsa, CajaStats, Casillero, CasilleroPosicion, Clienta, DashboardStats, Fardo, Movimiento, Paginated, Pedido, Usuario, Venta } from '../models/models';

interface ApiError extends Error {
  errors?: Record<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCasilleros(activosOnly = false): Observable<{ data: Casillero[] }> {
    const params = activosOnly ? new HttpParams().set('activos', '1') : undefined;
    return this.http.get<{ data: Casillero[] }>(`${this.base}/casilleros`, { params });
  }

  createCasillero(data: Partial<Casillero>): Observable<any> {
    return this.http.post(`${this.base}/casilleros`, data).pipe(catchError(this.handleError));
  }

  updateCasillero(id: number, data: Partial<Casillero>): Observable<any> {
    return this.http.put(`${this.base}/casilleros/${id}`, data).pipe(catchError(this.handleError));
  }

  deleteCasillero(id: number): Observable<any> {
    return this.http.delete(`${this.base}/casilleros/${id}`).pipe(catchError(this.handleError));
  }

  setCasilleroEstado(id: number, activo: boolean): Observable<any> {
    return this.http.patch(`${this.base}/casilleros/${id}/estado`, { activo }).pipe(catchError(this.handleError));
  }

  getPosiciones(id: number): Observable<{ data: CasilleroPosicion[] }> {
    return this.http.get<{ data: CasilleroPosicion[] }>(`${this.base}/casilleros/${id}/posiciones`);
  }

  getClientas(q = ''): Observable<Paginated<Clienta>> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Paginated<Clienta>>(`${this.base}/clientas`, { params });
  }

  createClienta(data: Partial<Clienta>): Observable<any> {
    return this.http.post(`${this.base}/clientas`, data).pipe(catchError(this.handleError));
  }

  updateClienta(id: number, data: Partial<Clienta>): Observable<any> {
    return this.http.put(`${this.base}/clientas/${id}`, data).pipe(catchError(this.handleError));
  }

  getClienta(id: number): Observable<{ data: Clienta }> {
    return this.http.get<{ data: Clienta }>(`${this.base}/clientas/${id}`);
  }

  deleteClienta(id: number): Observable<any> {
    return this.http.delete(`${this.base}/clientas/${id}`).pipe(catchError(this.handleError));
  }

  getPedidos(q = '', clientaId?: number): Observable<Paginated<Pedido>> {
    let params = q ? new HttpParams().set('q', q) : new HttpParams();
    if (clientaId) {
      params = params.set('clienta_id', String(clientaId));
    }
    return this.http.get<Paginated<Pedido>>(`${this.base}/pedidos`, { params });
  }

  createPedido(data: Partial<Pedido>): Observable<any> {
    return this.http.post(`${this.base}/pedidos`, data).pipe(catchError(this.handleError));
  }

  updatePedido(id: number, data: Partial<Pedido>): Observable<any> {
    return this.http.put(`${this.base}/pedidos/${id}`, data).pipe(catchError(this.handleError));
  }

  deletePedido(id: number): Observable<any> {
    return this.http.delete(`${this.base}/pedidos/${id}`).pipe(catchError(this.handleError));
  }

  getBolsas(q = ''): Observable<Paginated<Bolsa>> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Paginated<Bolsa>>(`${this.base}/bolsas`, { params });
  }

  createBolsa(data: Partial<Bolsa>): Observable<any> {
    return this.http.post(`${this.base}/bolsas`, data).pipe(catchError(this.handleError));
  }

  getBolsa(id: number): Observable<{ data: Bolsa }> {
    return this.http.get<{ data: Bolsa }>(`${this.base}/bolsas/${id}`);
  }

  entregarBolsa(id: number, observaciones?: string): Observable<any> {
    return this.http.post(`${this.base}/bolsas/${id}/entregar`, { observaciones }).pipe(catchError(this.handleError));
  }

  moverBolsa(id: number, casillero_id: number, posicion?: number | null): Observable<any> {
    return this.http.post(`${this.base}/bolsas/${id}/mover`, { casillero_id, posicion }).pipe(catchError(this.handleError));
  }

  deleteBolsa(id: number): Observable<any> {
    return this.http.delete(`${this.base}/bolsas/${id}`).pipe(catchError(this.handleError));
  }

  getMovimientos(bolsaId?: number): Observable<{ data: Movimiento[] }> {
    const params = bolsaId ? new HttpParams().set('bolsa_id', String(bolsaId)) : undefined;
    return this.http.get<{ data: Movimiento[] }>(`${this.base}/movimientos`, { params });
  }

  getDashboard(): Observable<{ data: DashboardStats }> {
    return this.http.get<{ data: DashboardStats }>(`${this.base}/dashboard`);
  }

  getCaja(filtro = 'hoy', desde?: string, hasta?: string): Observable<{ data: CajaStats }> {
    let params = new HttpParams().set('filtro', filtro);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<{ data: CajaStats }>(`${this.base}/caja`, { params });
  }

  getFardos(q = ''): Observable<{ data: Fardo[] }> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<{ data: Fardo[] }>(`${this.base}/fardos`, { params });
  }

  getFardo(id: number): Observable<{ data: Fardo }> {
    return this.http.get<{ data: Fardo }>(`${this.base}/fardos/${id}`);
  }

  createFardo(data: Partial<Fardo>): Observable<any> {
    return this.http.post(`${this.base}/fardos`, data).pipe(catchError(this.handleError));
  }

  updateFardo(id: number, data: Partial<Fardo>): Observable<any> {
    return this.http.put(`${this.base}/fardos/${id}`, data).pipe(catchError(this.handleError));
  }

  deleteFardo(id: number): Observable<any> {
    return this.http.delete(`${this.base}/fardos/${id}`).pipe(catchError(this.handleError));
  }

  createVenta(data: Partial<Venta>): Observable<any> {
    return this.http.post(`${this.base}/ventas`, data).pipe(catchError(this.handleError));
  }

  updateVenta(id: number, data: Partial<Venta>): Observable<any> {
    return this.http.put(`${this.base}/ventas/${id}`, data).pipe(catchError(this.handleError));
  }

  anularVenta(id: number): Observable<any> {
    return this.http.patch(`${this.base}/ventas/${id}/anular`, {}).pipe(catchError(this.handleError));
  }

  deleteVenta(id: number): Observable<any> {
    return this.http.delete(`${this.base}/ventas/${id}`).pipe(catchError(this.handleError));
  }

  getUsuarios(): Observable<{ data: Usuario[] }> {
    return this.http.get<{ data: Usuario[] }>(`${this.base}/usuarios`);
  }

  createUsuario(data: any): Observable<any> {
    return this.http.post(`${this.base}/usuarios`, data).pipe(catchError(this.handleError));
  }

  updateUsuario(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/usuarios/${id}`, data).pipe(catchError(this.handleError));
  }

  deleteUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.base}/usuarios/${id}`).pipe(catchError(this.handleError));
  }

  getPendientes(): Observable<{ data: Bolsa[] }> {
    return this.http.get<{ data: Bolsa[] }>(`${this.base}/dashboard/pendientes`);
  }

  buscar(q: string): Observable<{ data: Bolsa[] }> {
    const params = new HttpParams().set('q', q);
    return this.http.get<{ data: Bolsa[] }>(`${this.base}/buscar`, { params });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ha ocurrido un error inesperado.';
    const err = new Error(message) as ApiError;
    if (error.status === 422 && error.error?.errors) {
      err.errors = error.error.errors as Record<string, string[]>;
      const first = Object.values(err.errors)[0];
      message = Array.isArray(first) && first.length ? first[0] : String(first ?? message);
    } else if (error.error?.message && typeof error.error.message === 'string') {
      message = error.error.message;
    } else if (error.status === 0) {
      message = 'No se pudo conectar con el servidor.';
    }
    err.message = message;
    console.error(error);
    return throwError(() => err);
  }
}