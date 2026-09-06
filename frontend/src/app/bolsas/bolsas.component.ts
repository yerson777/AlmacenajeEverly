import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Bolsa, Casillero, Clienta, Pedido } from '../models/models';

@Component({
  selector: 'app-bolsas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bolsas.component.html',
  styleUrl: './bolsas.component.css'
})
export class BolsasComponent implements OnInit {
  bolsas: Bolsa[] = [];
  casilleros: Casillero[] = [];
  clientas: Clienta[] = [];
  pedidos: Pedido[] = [];
  q = '';
  error = '';
  mensaje = '';

  mostrarModalRegistrar = false;
  mostrarModalMover = false;
  detalle: Bolsa | null = null;

  formClientaId: number | null = null;
  formPedidoId: number | null = null;
  formCodigo = '';
  formCasilleroId: number | null = null;
  formPosicion: number | null = null;
  formFecha = '';
  formEstado = 'Pendiente de entrega';
  formObservaciones = '';
  autoCodigo = true;

  moverBolsa: Bolsa | null = null;
  moverCasilleroId: number | null = null;
  moverPosicion: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
    this.api.getCasilleros(true).subscribe({
      next: (res) => (this.casilleros = res.data),
      error: (e) => (this.error = e.message),
    });
    this.api.getClientas().subscribe({
      next: (res) => (this.clientas = res.data),
      error: (e) => (this.error = e.message),
    });
    this.api.getPedidos().subscribe({
      next: (res) => (this.pedidos = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  cargar(): void {
    this.api.getBolsas(this.q).subscribe({
      next: (res) => (this.bolsas = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  buscar(): void {
    this.cargar();
  }

  abrirRegistrar(): void {
    this.formClientaId = null;
    this.formPedidoId = null;
    this.formCodigo = '';
    this.formCasilleroId = null;
    this.formPosicion = null;
    this.formFecha = new Date().toISOString().slice(0, 10);
    this.formEstado = 'Pendiente de entrega';
    this.formObservaciones = '';
    this.autoCodigo = true;
    this.mostrarModalRegistrar = true;
    this.error = '';
  }

  onClientaCambio(): void {
    this.formPedidoId = null;
    this.pedidos = [];
    if (this.formClientaId) {
      this.api.getPedidos('', this.formClientaId).subscribe({
        next: (res) => (this.pedidos = res.data),
        error: (e) => (this.error = e.message),
      });
    }
  }

  casilleroCapacidad(): number {
    const c = this.casilleros.find((x) => x.id === this.formCasilleroId);
    return c ? c.capacidad : 30;
  }

  registrar(): void {
    this.error = '';
    const payload: any = {
      clienta_id: this.formClientaId,
      pedido_id: this.formPedidoId,
      casillero_id: this.formCasilleroId,
      posicion: this.formPosicion,
      fecha_almacenamiento: this.formFecha,
      estado: this.formEstado,
      observaciones: this.formObservaciones.trim() || null,
    };
    if (!this.autoCodigo) {
      payload.codigo = this.formCodigo.trim() || null;
    }

    this.api.createBolsa(payload).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.mostrarModalRegistrar = false;
        this.cargar();
        this.api.getCasilleros(true).subscribe((r) => (this.casilleros = r.data));
      },
      error: (e) => (this.error = e.message),
    });
  }

  entregar(b: Bolsa): void {
    if (!confirm(`¿Entregar la bolsa ${b.codigo} a ${b.clienta?.nombre}?\nSe liberará la posición del casillero.`)) return;
    this.api.entregarBolsa(b.id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  abrirMover(b: Bolsa): void {
    this.moverBolsa = b;
    this.moverCasilleroId = b.casillero_id;
    this.moverPosicion = null;
    this.mostrarModalMover = true;
    this.error = '';
  }

  mover(): void {
    this.error = '';
    if (!this.moverBolsa || !this.moverCasilleroId) {
      this.error = 'Seleccione un casillero de destino.';
      return;
    }
    this.api.moverBolsa(this.moverBolsa.id, this.moverCasilleroId, this.moverPosicion).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.mostrarModalMover = false;
        this.cargar();
        this.api.getCasilleros(true).subscribe((r) => (this.casilleros = r.data));
      },
      error: (e) => (this.error = e.message),
    });
  }

  verDetalle(b: Bolsa): void {
    this.api.getBolsa(b.id).subscribe({
      next: (res) => (this.detalle = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  eliminar(b: Bolsa): void {
    if (!confirm(`¿Eliminar la bolsa ${b.codigo}?`)) return;
    this.api.deleteBolsa(b.id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  ubicacion(b: Bolsa): string {
    if (!b.casillero || b.posicion === null || b.estado === 'Entregada') return 'Liberada';
    return `${b.casillero.codigo} / ${String(b.posicion).padStart(2, '0')}`;
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}