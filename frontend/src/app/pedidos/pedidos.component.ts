import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Clienta, Fardo, Pedido, Venta } from '../models/models';
import { ModalErrorComponent } from '../shared/modal-error.component';
import { aplicarErrorFormulario, mensajeError } from '../utils/api-errors';
import { validarTodo, errVisible, requerido, noNegativo, maxLong, fechaValida, positivo, ReglasPorCampo } from '../utils/validators';
import { autoDismiss } from '../utils/auto-dismiss';
import { FILTROS_POR_DEFECTO, aplicarFiltrosPorDefecto, limpiarFiltrosModulo } from '../utils/filtros';
import { PeticionCancelable } from '../utils/peticion-cancelable';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-pedidos',
    imports: [FormsModule, ModalErrorComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './pedidos.component.html'
})
export class PedidosComponent implements OnInit, OnDestroy {
  pedidos: Pedido[] = [];
  clientas: Clienta[] = [];
  q = FILTROS_POR_DEFECTO.pedidos.q;
  private qSubject = new Subject<string>();
  private qSub?: Subscription;
  cargandoLista = false;
  private readonly peticionLista = new PeticionCancelable();
  error = '';
  errorModal = '';
  mensaje = '';
  private mostrarMensaje = autoDismiss((m) => (this.mensaje = m));
  errores: Record<string, string> = {};
  intentado = false;
  guardando = false;
  errVisible = errVisible;

  tab = FILTROS_POR_DEFECTO.pedidos.tab;
  filtroMes: number | null = FILTROS_POR_DEFECTO.pedidos.filtroMes;
  filtroAnio: number | null = FILTROS_POR_DEFECTO.pedidos.filtroAnio;
  filtroCobro = FILTROS_POR_DEFECTO.pedidos.filtroCobro;
  pagina = FILTROS_POR_DEFECTO.pedidos.pagina;
  porPagina = 10;
  total = 0;
  desde = 0;
  hasta = 0;
  contadores = { pendientes: 0, completados: 0, todos: 0 };
  anios: number[] = [];
  meses = [
    { valor: 1, label: 'Ene' },
    { valor: 2, label: 'Feb' },
    { valor: 3, label: 'Mar' },
    { valor: 4, label: 'Abr' },
    { valor: 5, label: 'May' },
    { valor: 6, label: 'Jun' },
    { valor: 7, label: 'Jul' },
    { valor: 8, label: 'Ago' },
    { valor: 9, label: 'Sep' },
    { valor: 10, label: 'Oct' },
    { valor: 11, label: 'Nov' },
    { valor: 12, label: 'Dic' },
  ];

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
    limpiarFiltrosModulo('pedidos');
    aplicarFiltrosPorDefecto(this, 'pedidos');
    const anioActual = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.anios.push(anioActual - i);
    }

    this.qSub = this.qSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pagina = 1;
      this.guardarFiltros();
      this.cargar();
    });

    this.cargar();
    this.cargarClientas('');
  }

  reintentar(): void {
    this.cargar();
    this.cargarClientas('');
  }

  ngOnDestroy(): void {
    this.peticionLista.cancelar();
    this.qSub?.unsubscribe();
  }

  guardarFiltros(): void {
    try {
      localStorage.setItem('pedidos_filtros', JSON.stringify({
        tab: this.tab,
        filtroMes: this.filtroMes,
        filtroAnio: this.filtroAnio,
        filtroCobro: this.filtroCobro,
        pagina: this.pagina,
        q: this.q,
      }));
    } catch {}
  }

  cargar(): void {
    this.cargandoLista = true;
    this.error = '';
    this.peticionLista.ejecutar(this.api.getPedidos(this.q, undefined, false, this.tab, this.filtroMes, this.filtroAnio, this.filtroCobro || undefined, this.pagina), {
      next: (res: any) => {
        this.pedidos = res.data || [];
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
    this.guardarFiltros();
    this.qSubject.next(this.q);
  }

  cambiarTab(tab: string): void {
    this.tab = tab;
    this.pagina = 1;
    this.guardarFiltros();
    this.cargar();
  }

  cambiarFiltro(): void {
    this.pagina = 1;
    this.guardarFiltros();
    this.cargar();
  }

  restablecerFiltros(): void {
    this.filtroMes = null;
    this.filtroAnio = null;
    this.filtroCobro = '';
    this.pagina = 1;
    this.guardarFiltros();
    this.cargar();
  }

  textoVacio(): string {
    if (this.q.trim()) return 'No se encontraron pedidos con esa búsqueda.';
    if (this.tab === 'pendientes') return 'No hay pedidos pendientes.';
    if (this.tab === 'completados') return 'No hay pedidos completados.';
    return 'No hay pedidos registrados.';
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas()) return;
    this.pagina = p;
    this.guardarFiltros();
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
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
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
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  cargarClientas(q: string): void {
    this.api.getClientas(q).subscribe({
      next: (res) => (this.clientas = res.data),
      error: (e) => (this.errorModal = mensajeError(e)),
    });
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  cerrarCobro(): void {
    this.mostrarCobro = false;
    this.ventaExistente = null;
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  buscarClientas(): void {
    this.cargarClientas(this.qClientas.trim());
  }

  clientaLabel(c: Clienta): string {
    return c.telefono ? `${c.nombre} · ${c.telefono}` : c.nombre;
  }

  guardar(): void {
    if (this.guardando) return;
    this.error = '';
    this.errorModal = '';
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
      this.errorModal = 'Debe seleccionar una clienta.';
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

    this.guardando = true;
    request.subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cerrarModal();
        this.cargar();
      },
      error: (e) => aplicarErrorFormulario(e, this),
    });
  }

  eliminar(p: Pedido): void {
    if (!confirm(`¿Eliminar el pedido ${p.codigo}? Se eliminarán sus bolsas asociadas.`)) return;
    this.api.deletePedido(p.id).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cargar();
      },
      error: (e) => (this.error = mensajeError(e)),
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
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
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
        error: (e) => (this.errorModal = mensajeError(e)),
      });
    }
    this.mostrarCobro = true;
  }

  guardarCobro(): void {
    if (this.guardando) return;
    this.error = '';
    this.errorModal = '';
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
      this.errorModal = 'Seleccione un fardo e ingrese un monto mayor a 0.';
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

    this.guardando = true;
    request.subscribe({
      next: (res) => {
        this.mostrarMensaje(this.ventaExistente
          ? `Venta actualizada a ${this.money(this.formCobro.monto)}. Se reflejará en caja sin duplicar.`
          : res.message);
        this.mostrarCobro = false;
        this.ventaExistente = null;
        this.errorModal = '';
        this.cargar();
      },
      error: (e) => aplicarErrorFormulario(e, this),
    });
  }

  money(n: number | string | null): string {
    const v = Number(n || 0);
    return 'Bs ' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}