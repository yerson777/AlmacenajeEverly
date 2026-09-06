import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Clienta, Pedido } from '../models/models';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.css'
})
export class PedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  clientas: Clienta[] = [];
  q = '';
  error = '';
  mensaje = '';

  mostrarModal = false;
  editando = false;
  pedidoActual: Pedido | null = null;
  formCodigo = '';
  formClientaId: number | null = null;
  formFecha = '';
  formTotal: number | null = null;
  formEstado = 'Pendiente';
  formObservaciones = '';

  estados = ['Pendiente', 'Completado', 'Cancelado'];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
    this.api.getClientas().subscribe({
      next: (res) => (this.clientas = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  cargar(): void {
    this.api.getPedidos(this.q).subscribe({
      next: (res) => (this.pedidos = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  buscar(): void {
    this.cargar();
  }

  abrirCrear(): void {
    this.editando = false;
    this.pedidoActual = null;
    this.formCodigo = '';
    this.formClientaId = null;
    this.formFecha = new Date().toISOString().slice(0, 10);
    this.formTotal = null;
    this.formEstado = 'Pendiente';
    this.formObservaciones = '';
    this.mostrarModal = true;
    this.error = '';
  }

  abrirEditar(p: Pedido): void {
    this.editando = true;
    this.pedidoActual = p;
    this.formCodigo = p.codigo ?? '';
    this.formClientaId = p.clienta_id;
    this.formFecha = p.fecha ?? new Date().toISOString().slice(0, 10);
    this.formTotal = p.total != null ? Number(p.total) : null;
    this.formEstado = p.estado;
    this.formObservaciones = p.observaciones ?? '';
    this.mostrarModal = true;
    this.error = '';
  }

  guardar(): void {
    this.error = '';
    if (!this.formClientaId) {
      this.error = 'Debe seleccionar una clienta.';
      return;
    }
    const payload = {
      clienta_id: this.formClientaId,
      codigo: this.formCodigo.trim() || undefined,
      fecha: this.formFecha || null,
      total: this.formTotal,
      estado: this.formEstado,
      observaciones: this.formObservaciones.trim() || null,
    };
    const request = this.editando && this.pedidoActual
      ? this.api.updatePedido(this.pedidoActual.id, payload)
      : this.api.createPedido(payload);

    request.subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.mostrarModal = false;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  eliminar(p: Pedido): void {
    if (!confirm(`¿Eliminar el pedido ${p.codigo}? Se eliminarán sus bolsas asociadas.`)) return;
    this.api.deletePedido(p.id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }
}