import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Bolsa, CajaStats, Casillero, DashboardStats } from '../models/models';
import { CommonModule } from '@angular/common';
import { autoDismiss } from '../utils/auto-dismiss';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  casilleros: Casillero[] = [];
  pendientes: Bolsa[] = [];
  q = '';
  resultados: Bolsa[] = [];
  buscando = false;
  cargando = false;
  cargandoPendientes = false;
  error = '';
  mensaje = '';
  foto: Bolsa | null = null;
  cargandoFoto = false;
  paginaPendientes = 1;
  porPaginaPendientes = 10;
  totalPendientes = 0;
  desdePendientes = 0;
  hastaPendientes = 0;
  private mostrarMensaje = autoDismiss((m: string) => (this.mensaje = m));

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.paginaPendientes = 1;
    this.api.getDashboard().subscribe({
      next: (res) => (this.stats = res.data),
      error: (e) => (this.error = e.message),
    });
    this.api.getCasilleros(true).subscribe({
      next: (res) => (this.casilleros = res.data),
      error: (e) => (this.error = e.message),
    });
    this.cargarPendientes();
  }

  cargarPendientes(): void {
    this.cargandoPendientes = true;
    this.api.getPendientes(this.paginaPendientes).subscribe({
      next: (res: any) => {
        this.pendientes = res.data || [];
        this.totalPendientes = res.total || 0;
        this.paginaPendientes = res.current_page || this.paginaPendientes;
        this.porPaginaPendientes = res.per_page || this.porPaginaPendientes;
        if (this.totalPendientes === 0) {
          this.desdePendientes = 0;
          this.hastaPendientes = 0;
        } else {
          this.desdePendientes = (this.paginaPendientes - 1) * this.porPaginaPendientes + 1;
          this.hastaPendientes = Math.min(this.paginaPendientes * this.porPaginaPendientes, this.totalPendientes);
        }
        this.cargandoPendientes = false;
      },
      error: (e) => {
        this.error = e.message;
        this.cargandoPendientes = false;
      },
    });
  }

  cambiarPaginaPendientes(p: number): void {
    if (p < 1 || p > this.totalPaginasPendientes()) return;
    this.paginaPendientes = p;
    this.cargarPendientes();
  }

  totalPaginasPendientes(): number {
    if (this.porPaginaPendientes <= 0) return 1;
    return Math.max(1, Math.ceil(this.totalPendientes / this.porPaginaPendientes));
  }

  paginasPendientes(): number[] {
    const total = this.totalPaginasPendientes();
    const actual = this.paginaPendientes;
    const paginas: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  conic(parts: { color: string; value: number }[]): string {
    const total = parts.reduce((s, p) => s + (p.value || 0), 0);
    if (total <= 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let acc = 0;
    const stops: string[] = [];
    for (const p of parts) {
      const start = (acc / total) * 360;
      acc += p.value;
      const end = (acc / total) * 360;
      if (p.value > 0) stops.push(`${p.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }

  get totalBolsas(): number {
    return (this.stats?.bolsas_pendientes ?? 0) + (this.stats?.bolsas_entregadas ?? 0);
  }

  get bolsasDonut(): string {
    return this.conic([
      { color: '#f59e0b', value: this.stats?.bolsas_pendientes ?? 0 },
      { color: '#10b981', value: this.stats?.bolsas_entregadas ?? 0 },
    ]);
  }

  get casilleroResumen(): {
    disponibles: number;
    parciales: number;
    llenos: number;
    capacidad: number;
    ocupados: number;
    pct: number;
  } {
    let disponibles = 0;
    let parciales = 0;
    let llenos = 0;
    let capacidad = 0;
    let ocupados = 0;
    for (const c of this.casilleros) {
      capacidad += c.capacidad;
      ocupados += c.bolsas_activas;
      if (c.bolsas_activas === 0) disponibles++;
      else if (c.bolsas_activas >= c.capacidad) llenos++;
      else parciales++;
    }
    const pct = capacidad ? Math.round((ocupados / capacidad) * 100) : 0;
    return { disponibles, parciales, llenos, capacidad, ocupados, pct };
  }

  get totalCasilleros(): number {
    const r = this.casilleroResumen;
    return r.disponibles + r.parciales + r.llenos;
  }

  get casillerosDonut(): string {
    const r = this.casilleroResumen;
    return this.conic([
      { color: '#0ea5e9', value: r.disponibles },
      { color: '#f59e0b', value: r.parciales },
      { color: '#f43f5e', value: r.llenos },
    ]);
  }

  get ocupacionDonut(): string {
    const r = this.casilleroResumen;
    return this.conic([
      { color: '#c026d3', value: r.ocupados },
      { color: '#e5e7eb', value: r.capacidad - r.ocupados },
    ]);
  }

  ocupacionPorCasillero(): { codigo: string; pct: number; ocupados: number; capacidad: number; bar: string }[] {
    return this.casilleros
      .map((c) => {
        const pct = c.capacidad ? Math.round((c.bolsas_activas / c.capacidad) * 100) : 0;
        return {
          codigo: c.codigo,
          pct,
          ocupados: c.bolsas_activas,
          capacidad: c.capacidad,
          bar: `${Math.min(pct, 100)}%`,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }

  barColor(pct: number): string {
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  onBuscar(): void {
    const query = this.q.trim();
    this.error = '';
    this.mensaje = '';
    if (!query) {
      this.resultados = [];
      return;
    }
    this.buscando = true;
    this.api.buscar(query).subscribe({
      next: (res) => {
        this.resultados = res.data;
        this.buscando = false;
        if (res.data.length === 0) {
          this.mostrarMensaje('No se encontraron bolsas para la búsqueda.');
        }
      },
      error: (e) => {
        this.buscando = false;
        this.error = e.message;
      },
    });
  }

  verFoto(b: Bolsa): void {
    this.error = '';
    this.cargandoFoto = true;
    this.api.getBolsa(b.id).subscribe({
      next: (res) => {
        this.cargandoFoto = false;
        this.foto = res.data;
      },
      error: (e) => {
        this.cargandoFoto = false;
        this.error = e.message;
      },
    });
  }

  casilleroLabel(b: Bolsa): string {
    if (!b.casillero || b.posicion === null || b.posicion === undefined) return 'Liberada';
    return `${b.casillero.codigo} / ${String(b.posicion).padStart(2, '0')}`;
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}