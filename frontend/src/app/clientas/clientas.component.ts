import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Clienta } from '../models/models';

@Component({
  selector: 'app-clientas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientas.component.html',
  styleUrl: './clientas.component.css'
})
export class ClientasComponent implements OnInit {
  clientas: Clienta[] = [];
  q = '';
  error = '';
  mensaje = '';

  mostrarModal = false;
  editando = false;
  clientaActual: Clienta | null = null;
  detalle: Clienta | null = null;
  formNombre = '';
  formTelefono = '';
  formEmail = '';
  formDireccion = '';
  formNotas = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.getClientas(this.q).subscribe({
      next: (res) => {
        this.clientas = res.data;
      },
      error: (e) => (this.error = e.message),
    });
  }

  buscar(): void {
    this.error = '';
    this.cargar();
  }

  abrirCrear(): void {
    this.editando = false;
    this.formNombre = '';
    this.formTelefono = '';
    this.formEmail = '';
    this.formDireccion = '';
    this.formNotas = '';
    this.mostrarModal = true;
    this.error = '';
  }

  abrirEditar(c: Clienta): void {
    this.editando = true;
    this.clientaActual = c;
    this.formNombre = c.nombre;
    this.formTelefono = c.telefono ?? '';
    this.formEmail = c.email ?? '';
    this.formDireccion = c.direccion ?? '';
    this.formNotas = c.notas ?? '';
    this.mostrarModal = true;
    this.error = '';
  }

  guardar(): void {
    this.error = '';
    const payload = {
      nombre: this.formNombre.trim(),
      telefono: this.formTelefono.trim() || null,
      email: this.formEmail.trim() || null,
      direccion: this.formDireccion.trim() || null,
      notas: this.formNotas.trim() || null,
    };
    const request = this.editando && this.clientaActual
      ? this.api.updateClienta(this.clientaActual.id, payload)
      : this.api.createClienta(payload);

    request.subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.mostrarModal = false;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  verDetalle(c: Clienta): void {
    this.detalle = c;
    this.api.getClienta(c.id).subscribe({
      next: (res) => (this.detalle = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  eliminar(c: Clienta): void {
    if (!confirm(`¿Eliminar a ${c.nombre}? Se eliminarán también sus pedidos y bolsas.`)) return;
    this.api.deleteClienta(c.id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}