import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { CajaStats, Fardo, ResumenLiquidacion, SerieCaja, Venta } from '../models/models';
import { ModalErrorComponent } from '../shared/modal-error.component';
import { aplicarErrorFormulario } from '../utils/api-errors';
import { validarTodo, errVisible, requerido, maxLong, positivo, fechaValida, ReglasPorCampo } from '../utils/validators';
import { autoDismiss } from '../utils/auto-dismiss';
import { guardarFiltro, leerFiltro, leerPreferencia, leerValorFiltro, recordarPreferencia } from '../utils/filtros';
import { PeticionCancelable } from '../utils/peticion-cancelable';

type Filtro = 'hoy' | 'semana' | 'mes' | 'rango';
type TipoFardo = 'activos' | 'recuperados' | 'todos';
type VistaFardos = 'lista' | 'tarjetas';
type PeriodoLiquidacion = 'hoy' | 'semana' | 'mes' | 'total';

@Component({
    selector: 'app-caja',
    imports: [FormsModule, ModalErrorComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './caja.component.html'
})
export class CajaComponent implements OnInit, OnDestroy {
  datos: CajaStats | null = null;
  periodo: CajaStats | null = null;
  error = '';
  errorFiltro = '';
  errorModal = '';
  mensaje = '';
  private mostrarMensaje = autoDismiss((m) => (this.mensaje = m));
  cargandoInicial = true;
  cargandoFiltro = false;
  errores: Record<string, string> = {};
  intentado = false;
  guardando = false;
  errVisible = errVisible;

  private readonly filtrosValidos: readonly Filtro[] = ['hoy', 'semana', 'mes', 'rango'];
  private readonly peticion = new PeticionCancelable();

  filtro: Filtro = 'hoy';
  offsetPeriodo = 0;
  chartTab: 'dia' | 'semana' | 'mes' = 'dia';
  desde = '';
  hasta = '';

  tipoFardo: TipoFardo = 'activos';
  busquedaFardo = '';
  vistaFardos: VistaFardos = 'lista';
  paginaFardos = 1;
  readonly porPaginaFardos = 6;
  periodoLiquidacion: PeriodoLiquidacion = 'total';
  readonly periodosLiquidacion: PeriodoLiquidacion[] = ['hoy', 'semana', 'mes', 'total'];
  readonly tabsFardos: { id: TipoFardo; label: string }[] = [
    { id: 'activos', label: 'Activos' },
    { id: 'recuperados', label: 'Recuperados' },
    { id: 'todos', label: 'Todos' },
  ];

  formas = ['Efectivo', 'QR', 'Transferencia', 'Otro'];
  formaIcons: Record<string, string> = {
    Efectivo: 'bi-cash',
    QR: 'bi-qr-code',
    Transferencia: 'bi-bank',
    Otro: 'bi-three-dots',
  };

  mostrarFardo = false;
  editandoFardo: Fardo | null = null;
  formFardo = {
    codigo: '',
    categoria: '',
    descripcion: '',
    fecha_compra: '',
    capital_invertido: null as number | null,
    cantidad_prendas: null as number | null,
    estado: 'En venta',
    observaciones: '',
  };

  detalleFardo: Fardo | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.paginaFardos = 1;
    this.fechaHoy();
    this.filtro = leerFiltro('caja_filtro', this.filtrosValidos, 'hoy');

    const desdeGuardado = leerValorFiltro('caja_desde');
    const hastaGuardado = leerValorFiltro('caja_hasta');
    if (this.esFecha(desdeGuardado) && this.esFecha(hastaGuardado) && desdeGuardado <= hastaGuardado) {
      this.desde = desdeGuardado;
      this.hasta = hastaGuardado;
    }

    this.chartTab = leerPreferencia('caja_chart_tab', ['dia', 'semana', 'mes'], 'dia');
    this.periodoLiquidacion = leerPreferencia('caja_periodo_liquidacion', this.periodosLiquidacion, 'total');

    const vista = localStorage.getItem('caja_vista_fardos');
    if (vista === 'lista' || vista === 'tarjetas') this.vistaFardos = vista;

    this.sincronizarFiltro();
    this.cargar();
  }

  ngOnDestroy(): void {
    this.peticion.cancelar();
  }

  private fechaHoy(): void {
    const hoy = new Date();
    const hacer = (d: Date): string => {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const di = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${di}`;
    };
    const fin = new Date(hoy);
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 29);
    this.desde = hacer(inicio);
    this.hasta = hacer(fin);
  }

  private esFecha(valor: string | null): valor is string {
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(`${valor}T12:00:00`);
    return !Number.isNaN(fecha.getTime());
  }

  private sincronizarFiltro(): void {
    const rango = this.filtro === 'rango';
    guardarFiltro('caja_filtro', this.filtro, {
      caja_desde: rango ? this.desde : null,
      caja_hasta: rango ? this.hasta : null,
    });
  }

  private parametrosFiltro(): { desde?: string; hasta?: string; offset?: number } {
    if (this.filtro === 'rango') {
      return { desde: this.desde, hasta: this.hasta };
    }
    return { offset: this.offsetPeriodo };
  }

  cargar(): void {
    const inicial = !this.datos;
    if (inicial) this.cargandoInicial = true;
    this.cargandoFiltro = !inicial;
    this.error = '';
    this.errorFiltro = '';

    const { desde, hasta, offset } = this.parametrosFiltro();
    this.peticion.ejecutar(this.api.getCaja(this.filtro, desde, hasta, offset), {
      next: (res) => {
        this.datos = res.data;
        this.periodo = res.data;
        this.paginaFardos = 1;
      },
      error: () => {
        if (inicial) {
          this.error = 'No se pudo cargar la información de Caja. Intenta de nuevo.';
        } else {
          this.errorFiltro = 'No se pudieron actualizar los datos de Caja. Intenta de nuevo.';
        }
      },
      finalizar: () => {
        this.cargandoInicial = false;
        this.cargandoFiltro = false;
      },
    });
  }

  private cargarPeriodo(): void {
    if (!this.datos) {
      this.cargar();
      return;
    }

    this.cargandoFiltro = true;
    this.errorFiltro = '';
    const { desde, hasta, offset } = this.parametrosFiltro();
    this.peticion.ejecutar(this.api.getCaja(this.filtro, desde, hasta, offset), {
      next: (res) => {
        this.periodo = res.data;
      },
      error: () => {
        this.errorFiltro = 'No se pudieron actualizar los datos de Caja. Intenta de nuevo.';
      },
      finalizar: () => {
        this.cargandoFiltro = false;
      },
    });
  }

  setFiltro(f: string): void {
    if (!this.filtrosValidos.includes(f as Filtro)) return;
    if (this.filtro === f && f !== 'rango') return;
    this.filtro = f as Filtro;
    this.offsetPeriodo = 0;
    this.sincronizarFiltro();
    this.cargarPeriodo();
  }

  periodoAnterior(): void {
    if (this.filtro === 'rango') return;
    this.offsetPeriodo++;
    this.cargarPeriodo();
  }

  periodoSiguiente(): void {
    if (this.filtro === 'rango') return;
    if (this.offsetPeriodo === 0) return;
    this.offsetPeriodo--;
    this.cargarPeriodo();
  }

  periodoLabel(): string {
    const base = new Date();
    if (this.filtro === 'hoy') {
      const d = new Date(base.getTime() - this.offsetPeriodo * 24 * 60 * 60 * 1000);
      return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (this.filtro === 'semana') {
      const d = new Date(base.getTime() - this.offsetPeriodo * 7 * 24 * 60 * 60 * 1000);
      const inicio = new Date(d);
      const day = inicio.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      inicio.setDate(inicio.getDate() + diff);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 6);
      return `Semana · ${inicio.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })} – ${fin.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    if (this.filtro === 'mes') {
      const d = new Date(base.getFullYear(), base.getMonth() - this.offsetPeriodo, 1);
      return d.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });
    }
    return 'Rango';
  }

  aplicarRango(): void {
    if (!this.esFecha(this.desde) || !this.esFecha(this.hasta)) {
      this.errorFiltro = 'Seleccione una fecha inicial y una fecha final.';
      return;
    }
    if (this.desde > this.hasta) {
      this.errorFiltro = 'La fecha inicial no puede ser posterior a la fecha final.';
      return;
    }
    this.sincronizarFiltro();
    this.cargarPeriodo();
  }

  reintentarFiltro(): void {
    this.cargarPeriodo();
  }

  setChartTab(t: string): void {
    if (t !== 'dia' && t !== 'semana' && t !== 'mes') return;
    this.chartTab = t;
    recordarPreferencia('caja_chart_tab', t);
  }

  get serie(): SerieCaja[] {
    if (!this.periodo) return [];
    return this.chartTab === 'dia' ? this.periodo.series.diario : this.chartTab === 'semana' ? this.periodo.series.semanal : this.periodo.series.mensual;
  }

  get maxSerie(): number {
    return Math.max(...this.serie.map((s) => Number(s.ventas) || 0), 0);
  }

  get tieneSerie(): boolean {
    return this.serie.some((s) => Number(s.ventas) > 0);
  }

  isMax(i: SerieCaja): boolean {
    return Number(i.ventas) > 0 && Number(i.ventas) === this.maxSerie;
  }

  barHeight(v: number): number {
    if (!this.maxSerie) return 4;
    return Math.max(4, Math.round((Math.max(Number(v) || 0, 0) / this.maxSerie) * 150));
  }

  money(n: number | string | null): string {
    const v = Number(n || 0);
    return 'Bs ' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  pctCapital(f: Fardo): number {
    return Math.min(Math.max(Number(f.porcentaje_recuperacion) || 0, 0), 100);
  }

  // ------- Fardos: pestañas, búsqueda, vista y paginado -------
  private normalizarTexto(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  esRecuperado(f: Fardo): boolean {
    return !f.es_liquidacion && Number(f.capital_invertido) > 0 && Number(f.porcentaje_recuperacion) >= 100;
  }

  get totalFardosReales(): number {
    return (this.datos?.fardos ?? []).filter((f) => !f.es_liquidacion).length;
  }

  get fardosFiltrados(): Fardo[] {
    const term = this.normalizarTexto(this.busquedaFardo.trim());
    const lista = (this.datos?.fardos ?? []).filter((f) => {
      if (f.es_liquidacion) {
        if (this.tipoFardo === 'recuperados') return false;
      } else if (this.tipoFardo === 'activos' && this.esRecuperado(f)) {
        return false;
      } else if (this.tipoFardo === 'recuperados' && !this.esRecuperado(f)) {
        return false;
      }

      if (!term) return true;

      const texto = this.normalizarTexto(`${f.codigo} ${f.categoria} ${f.descripcion ?? ''}`);
      return texto.includes(term);
    });

    return lista.sort((a, b) => Number(b.es_liquidacion) - Number(a.es_liquidacion));
  }

  get fardosPagina(): Fardo[] {
    const inicio = (this.paginaFardos - 1) * this.porPaginaFardos;
    return this.fardosFiltrados.slice(inicio, inicio + this.porPaginaFardos);
  }

  get totalPaginasFardos(): number {
    return Math.max(1, Math.ceil(this.fardosFiltrados.length / this.porPaginaFardos));
  }

  get paginasFardos(): number[] {
    return Array.from({ length: this.totalPaginasFardos }, (_, i) => i + 1);
  }

  get rangoFardos(): string {
    const total = this.fardosFiltrados.length;
    if (!total) return '0 de 0';
    const inicio = (this.paginaFardos - 1) * this.porPaginaFardos + 1;
    const fin = Math.min(this.paginaFardos * this.porPaginaFardos, total);
    return `${inicio}-${fin} de ${total}`;
  }

  setTipoFardo(tipo: TipoFardo): void {
    this.tipoFardo = tipo;
    this.paginaFardos = 1;
  }

  setVistaFardos(vista: VistaFardos): void {
    this.vistaFardos = vista;
    localStorage.setItem('caja_vista_fardos', vista);
  }

  buscarFardo(): void {
    this.paginaFardos = 1;
  }

  limpiarBusquedaFardo(): void {
    this.busquedaFardo = '';
    this.paginaFardos = 1;
  }

  cambiarPaginaFardos(delta: number): void {
    const destino = this.paginaFardos + delta;
    if (destino < 1 || destino > this.totalPaginasFardos) return;
    this.paginaFardos = destino;
  }

  irPaginaFardos(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginasFardos) return;
    this.paginaFardos = pagina;
  }

  // ------- Liquidación -------
  setPeriodoLiquidacion(periodo: PeriodoLiquidacion): void {
    if (!this.periodosLiquidacion.includes(periodo)) return;
    this.periodoLiquidacion = periodo;
    recordarPreferencia('caja_periodo_liquidacion', periodo);
  }

  get resumenLiquidacion(): ResumenLiquidacion {
    return this.periodo?.liquidacion?.[this.periodoLiquidacion] ?? { total: 0, cantidad: 0 };
  }

  get promedioLiquidacion(): number {
    const { total, cantidad } = this.resumenLiquidacion;
    return cantidad > 0 ? total / cantidad : 0;
  }

  periodoLiquidacionLabel(): string {
    switch (this.periodoLiquidacion) {
      case 'hoy': return 'Hoy';
      case 'semana': return 'Esta semana';
      case 'mes': return 'Este mes';
      default: return 'Total histórico';
    }
  }

  barColor(pct: number): string {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  }

  estadoBadge(f: Fardo): string {
    if (f.estado_recuperacion === 'Capital recuperado') return 'bg-emerald-100 text-emerald-700';
    if (f.estado_recuperacion === 'En proceso') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  }

  filtroLabel(): string {
    if (!this.periodo) return '';
    switch (this.periodo.filtro) {
      case 'hoy': return 'Hoy';
      case 'semana': return 'Esta semana';
      case 'mes': return 'Este mes';
      default: return `Del ${this.formatFecha(this.periodo.desde)} al ${this.formatFecha(this.periodo.hasta)}`;
    }
  }

  formatFecha(f: string): string {
    if (!f) return '';
    const [y, m, d] = f.split('-');
    return `${d}/${m}/${y}`;
  }

  // ------- Fardos -------
  private reglasFardo(): ReglasPorCampo {
    return {
      categoria: [requerido(), maxLong(100)],
      capital_invertido: [requerido('El capital invertido es obligatorio.'), positivo()],
      fecha_compra: [fechaValida()],
      cantidad_prendas: [positivo()],
    };
  }

  abrirNuevoFardo(): void {
    this.editandoFardo = null;
    this.formFardo = {
      codigo: '',
      categoria: '',
      descripcion: '',
      fecha_compra: this.hasta,
      capital_invertido: null,
      cantidad_prendas: null,
      estado: 'En venta',
      observaciones: '',
    };
    this.mostrarFardo = true;
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  abrirEditarFardo(f: Fardo): void {
    this.editandoFardo = f;
    this.formFardo = {
      codigo: f.codigo,
      categoria: f.categoria,
      descripcion: f.descripcion ?? '',
      fecha_compra: f.fecha_compra ?? '',
      capital_invertido: Number(f.capital_invertido),
      cantidad_prendas: f.cantidad_prendas,
      estado: f.estado,
      observaciones: f.observaciones ?? '',
    };
    this.mostrarFardo = true;
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  cerrarFardo(): void {
    this.mostrarFardo = false;
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  guardarFardo(): void {
    if (this.guardando) return;
    this.error = '';
    this.errorModal = '';
    this.intentado = true;
    const res = validarTodo(
      {
        categoria: this.formFardo.categoria,
        capital_invertido: this.formFardo.capital_invertido,
        fecha_compra: this.formFardo.fecha_compra,
        cantidad_prendas: this.formFardo.cantidad_prendas,
      },
      this.reglasFardo()
    );
    this.errores = res.errores;
    if (!res.ok) return;

    if (!this.formFardo.categoria.trim() || this.formFardo.capital_invertido === null) {
      this.errorModal = 'La categoría y el capital invertido son obligatorios.';
      return;
    }
    const data: any = { ...this.formFardo };
    delete data.codigo;
    const obs = this.editandoFardo
      ? this.api.updateFardo(this.editandoFardo.id, data)
      : this.api.createFardo(data);
    this.guardando = true;
    obs.subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cerrarFardo();
        this.cargar();
      },
      error: (e) => aplicarErrorFormulario(e, this),
    });
  }

  eliminarFardo(f: Fardo): void {
    if (!confirm(`¿Eliminar el fardo ${f.codigo}? Se eliminarán también sus ventas.`)) return;
    this.api.deleteFardo(f.id).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  verFardo(f: Fardo): void {
    this.api.getFardo(f.id).subscribe({
      next: (res) => (this.detalleFardo = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  // ------- Ventas -------
  anularVenta(v: Venta): void {
    if (!confirm(`¿Anular la venta de ${this.money(v.monto)}?`)) return;
    this.api.anularVenta(v.id).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  eliminarVenta(v: Venta): void {
    if (!confirm(`¿Eliminar definitivamente la venta de ${this.money(v.monto)}?`)) return;
    this.api.deleteVenta(v.id).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  formaTotal(fp: string): number {
    return this.periodo?.resumen.forma_pago?.[fp]?.total ?? 0;
  }

  formaCantidad(fp: string): number {
    return this.periodo?.resumen.forma_pago?.[fp]?.cantidad ?? 0;
  }

  formaPct(fp: string): number {
    const total = this.periodo?.resumen.ventas ?? 0;
    if (!total) return 0;
    return Math.round(((this.formaTotal(fp) || 0) / total) * 100);
  }

  maxFormaPct(): number {
    return Math.max(...this.formas.map((fp) => this.formaPct(fp)), 0);
  }
}