import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { CajaStats, Fardo, SerieCaja, Venta } from '../models/models';
import { validarTodo, errVisible, requerido, maxLong, positivo, fechaValida, ReglasPorCampo } from '../utils/validators';

type Filtro = 'hoy' | 'semana' | 'mes' | 'rango';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './caja.component.html'
})
export class CajaComponent implements OnInit {
  datos: CajaStats | null = null;
  error = '';
  mensaje = '';
  cargando = true;
  errores: Record<string, string> = {};
  intentado = false;
  errVisible = errVisible;

  filtro: Filtro = 'hoy';
  chartTab: 'dia' | 'semana' | 'mes' = 'dia';
  desde = '';
  hasta = '';

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
    this.fechaHoy();
    this.cargar();
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

  cargar(): void {
    this.cargando = true;
    this.error = '';
    const desde = this.filtro === 'rango' ? this.desde : undefined;
    const hasta = this.filtro === 'rango' ? this.hasta : undefined;
    this.api.getCaja(this.filtro, desde, hasta).subscribe({
      next: (res) => {
        this.datos = res.data;
        this.cargando = false;
      },
      error: (e) => {
        this.error = e.message;
        this.cargando = false;
      },
    });
  }

  setFiltro(f: string): void {
    this.filtro = f as Filtro;
    this.cargar();
  }

  setChartTab(t: string): void {
    this.chartTab = t as 'dia' | 'semana' | 'mes';
  }

  get serie(): SerieCaja[] {
    if (!this.datos) return [];
    return this.chartTab === 'dia' ? this.datos.series.diario : this.chartTab === 'semana' ? this.datos.series.semanal : this.datos.series.mensual;
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
    if (!this.datos) return '';
    switch (this.datos.filtro) {
      case 'hoy': return 'Hoy';
      case 'semana': return 'Esta semana';
      case 'mes': return 'Este mes';
      default: return `Del ${this.formatFecha(this.datos.desde)} al ${this.formatFecha(this.datos.hasta)}`;
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
    this.errores = {};
    this.intentado = false;
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
    this.errores = {};
    this.intentado = false;
  }

  guardarFardo(): void {
    this.error = '';
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
      this.error = 'La categoría y el capital invertido son obligatorios.';
      return;
    }
    const data: any = { ...this.formFardo };
    delete data.codigo;
    const obs = this.editandoFardo
      ? this.api.updateFardo(this.editandoFardo.id, data)
      : this.api.createFardo(data);
    obs.subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.mostrarFardo = false;
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

  eliminarFardo(f: Fardo): void {
    if (!confirm(`¿Eliminar el fardo ${f.codigo}? Se eliminarán también sus ventas.`)) return;
    this.api.deleteFardo(f.id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
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
        this.mensaje = res.message;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  eliminarVenta(v: Venta): void {
    if (!confirm(`¿Eliminar definitivamente la venta de ${this.money(v.monto)}?`)) return;
    this.api.deleteVenta(v.id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  formaTotal(fp: string): number {
    return this.datos?.resumen.forma_pago?.[fp]?.total ?? 0;
  }

  formaCantidad(fp: string): number {
    return this.datos?.resumen.forma_pago?.[fp]?.cantidad ?? 0;
  }

  formaPct(fp: string): number {
    const total = this.datos?.resumen.ventas ?? 0;
    if (!total) return 0;
    return Math.round(((this.formaTotal(fp) || 0) / total) * 100);
  }

  maxFormaPct(): number {
    return Math.max(...this.formas.map((fp) => this.formaPct(fp)), 0);
  }
}