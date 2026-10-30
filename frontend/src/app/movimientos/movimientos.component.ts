import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Movimiento } from '../models/models';
import { FILTROS_POR_DEFECTO, aplicarFiltrosPorDefecto, guardarFiltro, limpiarFiltrosModulo } from '../utils/filtros';
import { mensajeError } from '../utils/api-errors';
import { PeticionCancelable } from '../utils/peticion-cancelable';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

type FiltroMovimiento = '' | 'Almacenada' | 'Entregada' | 'Movida';

@Component({
    selector: 'app-movimientos',
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './movimientos.component.html'
})
export class MovimientosComponent implements OnInit, OnDestroy {
  movimientos: Movimiento[] = [];
  error = '';
  cargandoLista = true;
  private readonly peticionLista = new PeticionCancelable();
  q = FILTROS_POR_DEFECTO.movimientos.q;
  private qSubject = new Subject<string>();
  private qSub?: Subscription;
  filtroTipo: FiltroMovimiento = FILTROS_POR_DEFECTO.movimientos.filtroTipo as FiltroMovimiento;
  pagina = FILTROS_POR_DEFECTO.movimientos.pagina;
  porPagina = 10;
  total = 0;
  desde = 0;
  hasta = 0;
  contadores = { almacenadas: 0, entregadas: 0, movidas: 0, todos: 0 };
  private readonly filtrosValidos: readonly FiltroMovimiento[] = ['', 'Almacenada', 'Entregada', 'Movida'];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    limpiarFiltrosModulo('movimientos');
    aplicarFiltrosPorDefecto(this, 'movimientos');
    guardarFiltro('movimientos_filtro', this.filtroTipo);

    this.qSub = this.qSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pagina = 1;
      this.cargar();
    });

    this.cargar();
  }

  ngOnDestroy(): void {
    this.peticionLista.cancelar();
    this.qSub?.unsubscribe();
  }

  cargar(): void {
    this.cargandoLista = true;
    this.error = '';
    this.peticionLista.ejecutar(this.api.getMovimientos(this.q, this.filtroTipo, this.pagina), {
      next: (res) => {
        this.movimientos = res.data || [];
        this.total = res.total || 0;
        this.pagina = res.current_page || this.pagina;
        this.porPagina = res.per_page || this.porPagina;
        if (res.contadores) {
          this.contadores = res.contadores;
        }
        if (this.total === 0) {
          this.desde = 0;
          this.hasta = 0;
        } else {
          this.desde = (this.pagina - 1) * this.porPagina + 1;
          this.hasta = Math.min(this.pagina * this.porPagina, this.total);
        }
      },
      error: (e) => (this.error = mensajeError(e)),
      finalizar: () => (this.cargandoLista = false),
    });
  }

  buscar(): void {
    this.pagina = 1;
    this.qSubject.next(this.q);
  }

  limpiarBusqueda(): void {
    this.q = '';
    this.pagina = 1;
    this.qSubject.next(this.q);
  }

  setFiltroTipo(t: string): void {
    if (!this.filtrosValidos.includes(t as FiltroMovimiento)) return;
    this.filtroTipo = this.filtroTipo === t ? '' : (t as FiltroMovimiento);
    this.pagina = 1;
    guardarFiltro('movimientos_filtro', this.filtroTipo);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.q = '';
    this.filtroTipo = '';
    this.pagina = 1;
    guardarFiltro('movimientos_filtro', '');
    this.cargar();
  }

  textoVacio(): string {
    if (this.q.trim()) return 'No hay movimientos que coincidan con la búsqueda.';
    if (this.filtroTipo === 'Almacenada') return 'No hay movimientos de almacenamiento.';
    if (this.filtroTipo === 'Entregada') return 'No hay movimientos de entrega.';
    if (this.filtroTipo === 'Movida') return 'No hay movimientos de traslado.';
    return 'No hay movimientos registrados.';
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas()) return;
    this.pagina = p;
    this.cargar();
  }

  totalPaginas(): number {
    if (this.porPagina <= 0) return 1;
    return Math.max(1, Math.ceil(this.total / this.porPagina));
  }

  paginas(): number[] {
    const total = this.totalPaginas();
    const actual = this.pagina;
    const paginas: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  contarTipo(t: string): number {
    if (t === 'Almacenada') return this.contadores.almacenadas;
    if (t === 'Entregada') return this.contadores.entregadas;
    if (t === 'Movida') return this.contadores.movidas;
    return this.contadores.todos;
  }

  origen(m: Movimiento): string {
    if (m.casillero_origen && m.posicion_origen != null) {
      return `${m.casillero_origen.codigo} / ${String(m.posicion_origen).padStart(2, '0')}`;
    }
    return '—';
  }

  destino(m: Movimiento): string {
    if (m.casillero_destino && m.posicion_destino != null) {
      return `${m.casillero_destino.codigo} / ${String(m.posicion_destino).padStart(2, '0')}`;
    }
    return '—';
  }
}
