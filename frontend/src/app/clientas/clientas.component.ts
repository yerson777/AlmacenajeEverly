import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Clienta } from '../models/models';
import { ModalErrorComponent } from '../shared/modal-error.component';
import { aplicarErrorFormulario, mensajeError } from '../utils/api-errors';
import { validarTodo, errVisible, requerido, soloLetras, soloDigitos, maxLong, emailOk, ReglasPorCampo } from '../utils/validators';
import { autoDismiss } from '../utils/auto-dismiss';
import { FILTROS_POR_DEFECTO, aplicarFiltrosPorDefecto, limpiarFiltrosModulo } from '../utils/filtros';
import { PeticionCancelable } from '../utils/peticion-cancelable';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-clientas',
    imports: [FormsModule, ModalErrorComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './clientas.component.html'
})
export class ClientasComponent implements OnInit, OnDestroy {
  clientas: Clienta[] = [];
  q = FILTROS_POR_DEFECTO.clientas.q;
  private qSubject = new Subject<string>();
  private qSub?: Subscription;
  cargandoLista = false;
  private readonly peticionLista = new PeticionCancelable();
  error = '';
  errorModal = '';
  mensaje = '';
  private mostrarMensaje = autoDismiss((m) => (this.mensaje = m));

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
  guardando = false;
  errVisible = errVisible;

  pagina = FILTROS_POR_DEFECTO.clientas.pagina;
  porPagina = 10;
  total = 0;
  desde = 0;
  hasta = 0;

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
    limpiarFiltrosModulo('clientas');
    aplicarFiltrosPorDefecto(this, 'clientas');

    this.qSub = this.qSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pagina = 1;
      this.guardarFiltros();
      this.cargar();
    });

    this.cargar();
  }

  ngOnDestroy(): void {
    this.peticionLista.cancelar();
    this.qSub?.unsubscribe();
  }

  guardarFiltros(): void {
    try {
      localStorage.setItem('clientas_filtros', JSON.stringify({
        pagina: this.pagina,
        q: this.q,
      }));
    } catch {}
  }

  cargar(): void {
    this.cargandoLista = true;
    this.error = '';
    this.peticionLista.ejecutar(this.api.getClientas(this.q, this.pagina), {
      next: (res: any) => {
        this.clientas = res.data || [];
        this.total = res.total || 0;
        this.pagina = res.current_page || this.pagina;
        this.porPagina = res.per_page || this.porPagina;
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
    this.error = '';
    this.pagina = 1;
    this.guardarFiltros();
    this.qSubject.next(this.q);
  }

  textoVacio(): string {
    return this.q.trim()
      ? 'No hay clientas que coincidan con la búsqueda.'
      : 'No hay clientas registradas.';
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

  abrirCrear(): void {
    this.editando = false;
    this.formNombre = '';
    this.formTelefono = '';
    this.formEmail = '';
    this.formDireccion = '';
    this.formNotas = '';
    this.mostrarModal = true;
    this.error = '';
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
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
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  onTelefonoInput(): void {
    this.formTelefono = this.formTelefono.replace(/\D/g, '').slice(0, 8);
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  guardar(): void {
    if (this.guardando) return;
    this.error = '';
    this.errorModal = '';
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
      nombre: this.formNombre.trim().replace(/\s+/g, ' '),
      telefono: this.formTelefono.replace(/[\s\-().]/g, '').trim() || null,
      email: this.formEmail.trim().toLowerCase() || null,
      direccion: this.formDireccion.trim().replace(/\s+/g, ' ') || null,
      notas: this.formNotas.trim() || null,
    };
    const request = this.editando && this.clientaActual
      ? this.api.updateClienta(this.clientaActual.id, payload)
      : this.api.createClienta(payload);

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

  verDetalle(c: Clienta): void {
    this.detalle = c;
    this.api.getClienta(c.id).subscribe({
      next: (res) => (this.detalle = res.data),
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  eliminar(c: Clienta): void {
    if (!confirm(`¿Eliminar a ${c.nombre}? Se eliminarán también sus pedidos y bolsas.`)) return;
    this.api.deleteClienta(c.id).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cargar();
      },
      error: (e) => (this.error = mensajeError(e)),
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