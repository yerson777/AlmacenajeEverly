import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Clienta } from '../models/models';
import { validarTodo, errVisible, requerido, soloLetras, soloDigitos, maxLong, emailOk, ReglasPorCampo } from '../utils/validators';

@Component({
  selector: 'app-clientas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './clientas.component.html'
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
  errores: Record<string, string> = {};
  intentado = false;
  errVisible = errVisible;

  private reglas(): ReglasPorCampo {
    return {
      nombre: [
        requerido('El nombre es obligatorio.'),
        soloLetras('El nombre solo puede contener letras y espacios.'),
        maxLong(255, 'El nombre no debe superar los 255 caracteres.'),
      ],
      telefono: [soloDigitos(8, 'El teléfono debe tener exactamente 8 dígitos.')],
      email: [emailOk('Ingrese un correo electrónico válido.'), maxLong(255, 'El correo no debe superar los 255 caracteres.')],
      direccion: [maxLong(255, 'La dirección no debe superar los 255 caracteres.')],
      notas: [maxLong(500, 'Las notas no deben superar los 500 caracteres.')],
    };
  }

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
    this.errores = {};
    this.intentado = false;
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
    this.errores = {};
    this.intentado = false;
  }

  guardar(): void {
    this.error = '';
    this.intentado = true;
    const res = validarTodo(
      {
        nombre: this.formNombre,
        telefono: this.formTelefono,
        email: this.formEmail,
        direccion: this.formDireccion,
        notas: this.formNotas,
      },
      this.reglas()
    );
    this.errores = res.errores;
    if (!res.ok) return;

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
      error: (err) => {
        const e = err as any;
        if (e?.errors) {
          this.errores = e.errors;
          this.intentado = true;
        }
        this.error = e.message;
      },
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

  iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  fmtFecha(s: string | null): string {
    if (!s) return '—';
    const solo = String(s).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(solo)) {
      const [y, m, d] = solo.split('-');
      return `${d}/${m}/${y}`;
    }
    return String(s);
  }

  fmtMoney(n: string | number | null): string {
    if (n === null || n === undefined || n === '') return '—';
    return 'Bs ' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  pedidoEstadoClass(e: string): string {
    if (e === 'Completado') return 'bg-emerald-100 text-emerald-700';
    if (e === 'Cancelado') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  bolsaEstadoClass(e: string): string {
    if (e === 'Entregada') return 'bg-emerald-100 text-emerald-700';
    return 'bg-amber-100 text-amber-700';
  }

  get totalPedidos(): number {
    return this.detalle?.pedidos?.length ?? 0;
  }

  get pedidosCompletados(): number {
    return this.detalle?.pedidos?.filter((p) => p.estado === 'Completado').length ?? 0;
  }

  get bolsasActivas(): number {
    return this.detalle?.bolsas?.filter((b) => b.estado !== 'Entregada').length ?? 0;
  }

  get bolsasEntregadas(): number {
    return this.detalle?.bolsas?.filter((b) => b.estado === 'Entregada').length ?? 0;
  }
}