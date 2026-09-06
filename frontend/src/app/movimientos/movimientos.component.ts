import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { Movimiento } from '../models/models';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './movimientos.component.html',
  styleUrl: './movimientos.component.css'
})
export class MovimientosComponent implements OnInit {
  movimientos: Movimiento[] = [];
  error = '';
  cargando = true;

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