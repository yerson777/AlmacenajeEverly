import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Movimiento } from '../models/models';

@Component({
    selector: 'app-movimientos',
    imports: [CommonModule, FormsModule],
    templateUrl: './movimientos.component.html'
})
export class MovimientosComponent implements OnInit {
  movimientos: Movimiento[] = [];
  error = '';
  cargando = true;
  q = '';
  filtroTipo = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getMovimientos().subscribe({
      next: (res) => {
        this.movimientos = res.data;
        this.cargando = false;
      },
      error: (e) => {
        this.error = e.message;
        this.cargando = false;
      },
    });
  }

  get movimientosVisibles(): Movimiento[] {
    return this.movimientos.filter((m) => {
      const porTipo = !this.filtroTipo || m.tipo === this.filtroTipo;
      const busqueda = (m.bolsa?.codigo ?? '').toLowerCase();
      const porBolsa = !this.q || busqueda.includes(this.q.trim().toLowerCase());
      return porTipo && porBolsa;
    });
  }

  setFiltroTipo(t: string): void {
    this.filtroTipo = this.filtroTipo === t ? '' : t;
  }

  contarTipo(t: string): number {
    return this.movimientos.filter((m) => m.tipo === t).length;
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