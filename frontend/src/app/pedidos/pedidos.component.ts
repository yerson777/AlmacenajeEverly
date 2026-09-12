import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Clienta, Fardo, Pedido, Venta } from '../models/models';
import { validarTodo, errVisible, requerido, noNegativo, maxLong, fechaValida, positivo, ReglasPorCampo } from '../utils/validators';

@Component({
    selector: 'app-pedidos',
    imports: [FormsModule],
    templateUrl: './pedidos.component.html'
})
export class PedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  clientas: Clienta[] = [];
  q = '';
  error = '';
  mensaje = '';
  errores: Record<string, string> = {};
  intentado = false;
  errVisible = errVisible;

  mostrarModal = false;
  editando = false;
  pedidoActual: Pedido | null = null;
  formCodigo = '';
  formClientaId: number | null = null;
  formFecha = '';
  formTotal: number | null = null;
  formEstado = 'Pendiente';
  formObservaciones = '';
  qClientas = '';

  estados = ['Pendiente', 'Completado', 'Cancelado'];

  mostrarCobro = false;
  fardos: Fardo[] = [];
  cobroPedido: Pedido | null = null;
  ventaExistente: { id: number; monto: number; fardo_id: number | null } | null = null;
  formCobro = {
    fardo_id: null as number | null,
    monto: null as number | null,
    forma_pago: 'Efectivo',
    fecha: '',
    observaciones: '',
  };
  formas = ['Efectivo', 'QR', 'Transferencia', 'Otro'];

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

  private reglasPedido(): ReglasPorCampo {
    return {
      clienta_id: [requerido('Seleccione una clienta.')],
      total: [noNegativo()],
      fecha: [fechaValida()],
      observaciones: [maxLong(500)],
    };
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
    this.qClientas = '';
    this.cargarClientas('');
    this.mostrarModal = true;
    this.error = '';
    this.errores = {};
    this.intentado = false;
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
    this.qClientas = '';
    this.cargarClientas('');
    this.mostrarModal = true;
    this.error = '';
    this.errores = {};
    this.intentado = false;
  }

  cargarClientas(q: string): void {
    this.api.getClientas(q).subscribe({
      next: (res) => (this.clientas = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  buscarClientas(): void {
    this.cargarClientas(this.qClientas.trim());
  }

  clientaLabel(c: Clienta): string {
    return c.telefono ? `${c.nombre} · ${c.telefono}` : c.nombre;
  }

  guardar(): void {
    this.error = '';
    this.intentado = true;
    const res = validarTodo(
      {
        clienta_id: this.formClientaId,
        total: this.formTotal,
        fecha: this.formFecha,
        observaciones: this.formObservaciones.trim(),
      },
      this.reglasPedido()
    );
    this.errores = res.errores;
    if (!res.ok) return;
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
      error: (e) => {
        const errs = (e as any)?.errors;
        if (errs && Object.keys(errs).length) {
          this.errores = Object.fromEntries(
            Object.entries(errs).map(([c, msgs]) => [c, Array.isArray(msgs) ? msgs[0] : String(msgs)])
          ) as Record<string, string>;
          this.intentado = true;
        } else {
          this.error = e.message;
        }
      },
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

  private reglasCobro(): ReglasPorCampo {
    return {
      fardo_id: [requerido('Seleccione un fardo.')],
      monto: [positivo('El monto debe ser mayor a 0.')],
      forma_pago: [requerido('Seleccione la forma de pago.')],
      fecha: [fechaValida()],
      observaciones: [maxLong(500)],
    };
  }

  cobrable(p: Pedido): boolean {
    if (!p.venta_activa) return true;
    return Number(p.venta_activa.monto) !== Number(p.total);
  }

  abrirCobro(p: Pedido): void {
    this.error = '';
    this.errores = {};
    this.intentado = false;
    const va = p.venta_activa ?? null;
    if (va && Number(va.monto) === Number(p.total)) {
      this.error = `Este pedido ya fue cobrado por ${this.money(va.monto)}. Para volver a cobrarlo, primero edite el monto del pedido; al confirmar se actualizará la venta sin duplicarla en caja.`;
      return;
    }
    this.ventaExistente = va;
    this.cobroPedido = p;
    this.formCobro = {
      fardo_id: null,
      monto: p.total != null && Number(p.total) > 0 ? Number(p.total) : null,
      forma_pago: 'Efectivo',
      fecha: new Date().toISOString().slice(0, 10),
      observaciones: '',
    };
    if (this.fardos.length === 0) {
      this.api.getFardos().subscribe({
        next: (res) => {
          this.fardos = res.data;
        },
        error: (e) => (this.error = e.message),
      });
    }
    this.mostrarCobro = true;
  }

  guardarCobro(): void {
    this.error = '';
    if (!this.cobroPedido) return;
    this.intentado = true;
    const res = validarTodo(
      {
        fardo_id: this.formCobro.fardo_id,
        monto: this.formCobro.monto,
        forma_pago: this.formCobro.forma_pago,
        fecha: this.formCobro.fecha,
        observaciones: this.formCobro.observaciones.trim(),
      },
      this.reglasCobro()
    );
    this.errores = res.errores;
    if (!res.ok) return;
    if (!this.formCobro.fardo_id || this.formCobro.monto === null) {
      this.error = 'Seleccione un fardo e ingrese un monto mayor a 0.';
      return;
    }
    const payload: Partial<Venta> = {
      fardo_id: this.formCobro.fardo_id,
      monto: this.formCobro.monto,
      clienta_id: this.cobroPedido.clienta_id,
      pedido_id: this.cobroPedido.id,
      forma_pago: this.formCobro.forma_pago,
      fecha: this.formCobro.fecha,
      observaciones: this.formCobro.observaciones,
    };

    const request = this.ventaExistente
      ? this.api.updateVenta(this.ventaExistente.id, payload)
      : this.api.createVenta(payload);

    request.subscribe({
      next: (res) => {
        this.mensaje = this.ventaExistente
          ? `Venta actualizada a ${this.money(this.formCobro.monto)}. Se reflejará en caja sin duplicar.`
          : res.message;
        this.mostrarCobro = false;
        this.ventaExistente = null;
        this.cargar();
      },
      error: (e) => {
        const errs = (e as any)?.errors;
        if (errs && Object.keys(errs).length) {
          this.errores = Object.fromEntries(
            Object.entries(errs).map(([c, msgs]) => [c, Array.isArray(msgs) ? msgs[0] : String(msgs)])
          ) as Record<string, string>;
          this.intentado = true;
        } else {
          this.error = e.message;
        }
      },
    });
  }

  money(n: number | string | null): string {
    const v = Number(n || 0);
    return 'Bs ' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}