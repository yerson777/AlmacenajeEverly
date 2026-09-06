import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Bolsa, DashboardStats } from '../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  pendientes: Bolsa[] = [];
  resultados: Bolsa[] = [];
  q = '';
  buscando = false;
  mensaje = '';
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getDashboard().subscribe({
      next: (res) => (this.stats = res.data),
      error: (e) => (this.error = e.message),
    });
    this.api.getPendientes().subscribe({
      next: (res) => (this.pendientes = res.data),
      error: (e) => (this.error = e.message),
    });
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
          this.mensaje = 'No se encontraron bolsas para la búsqueda.';
        }
      },
      error: (e) => {
        this.buscando = false;
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