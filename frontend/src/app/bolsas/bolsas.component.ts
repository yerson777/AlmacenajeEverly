import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Bolsa, Casillero, Clienta, Pedido } from '../models/models';
import { ModalErrorComponent } from '../shared/modal-error.component';
import { aplicarErrorFormulario, mensajeError } from '../utils/api-errors';
import { validarTodo, errVisible, requerido, maxLong, fechaValida, entero, ReglasPorCampo } from '../utils/validators';
import { autoDismiss } from '../utils/auto-dismiss';
import { PeticionCancelable } from '../utils/peticion-cancelable';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-bolsas',
    imports: [CommonModule, FormsModule, ModalErrorComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './bolsas.component.html'
})
export class BolsasComponent implements OnInit, OnDestroy {
  bolsas: Bolsa[] = [];
  casilleros: Casillero[] = [];
  clientas: Clienta[] = [];
  pedidos: Pedido[] = [];
  cargandoPedidos = false;
  cargandoLista = false;
  private readonly peticionLista = new PeticionCancelable();
  q = '';
  private qSubject = new Subject<string>();
  private qSub?: Subscription;
  error = '';
  errorModal = '';
  mensaje = '';
  private mostrarMensaje = autoDismiss((m) => (this.mensaje = m));
  errores: Record<string, string> = {};
  intentado = false;
  guardando = false;
  errVisible = errVisible;

  tab = 'pendientes';
  filtroMes: number | null = null;
  filtroAnio: number | null = null;
  filtroCasilleroId: number | null = null;
  filtroUbicacion = '';
  pagina = 1;
  porPagina = 10;
  total = 0;
  desde = 0;
  hasta = 0;
  contadores = { pendientes: 0, entregadas: 0, todos: 0 };
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
  formImagen: string | null = null;
  autoCodigo = true;
  qClientas = '';

  mostrarModalCamara = false;
  camaraActiva = false;
  camaraError = '';
  private streamCamara: MediaStream | null = null;

  moverBolsa: Bolsa | null = null;
  moverCasilleroId: number | null = null;
  moverPosicion: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.pagina = 1;
    const anioActual = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.anios.push(anioActual - i);
    }

    const guardados = localStorage.getItem('bolsas_filtros');
    if (guardados) {
      try {
        const g = JSON.parse(guardados);
        if (g.tab) this.tab = g.tab;
        if (g.filtroMes !== undefined) this.filtroMes = g.filtroMes;
        if (g.filtroAnio !== undefined) this.filtroAnio = g.filtroAnio;
        if (g.filtroCasilleroId !== undefined) this.filtroCasilleroId = g.filtroCasilleroId;
        if (g.filtroUbicacion !== undefined) this.filtroUbicacion = g.filtroUbicacion;
        if (g.q) this.q = g.q;
      } catch {}
    }

    this.qSub = this.qSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pagina = 1;
      this.guardarFiltros();
      this.cargar();
    });

    this.cargar();
    this.api.getCasilleros(true).subscribe({
      next: (res) => (this.casilleros = res.data),
      error: (e) => (this.error = e.message),
    });
    this.api.getClientas().subscribe({
      next: (res) => (this.clientas = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  ngOnDestroy(): void {
    this.peticionLista.cancelar();
    this.qSub?.unsubscribe();
  }

  guardarFiltros(): void {
    try {
      localStorage.setItem('bolsas_filtros', JSON.stringify({
        tab: this.tab,
        filtroMes: this.filtroMes,
        filtroAnio: this.filtroAnio,
        filtroCasilleroId: this.filtroCasilleroId,
        filtroUbicacion: this.filtroUbicacion,
        pagina: this.pagina,
        q: this.q,
      }));
    } catch {}
  }

  cargar(): void {
    this.cargandoLista = true;
    this.error = '';
    this.peticionLista.ejecutar(this.api.getBolsas(this.q, this.tab, this.filtroMes, this.filtroAnio, this.filtroCasilleroId, this.filtroUbicacion || undefined, this.pagina), {
      next: (res: any) => {
        this.bolsas = res.data || [];
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
    this.filtroCasilleroId = null;
    this.filtroUbicacion = '';
    this.pagina = 1;
    this.guardarFiltros();
    this.cargar();
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

  private reglasRegistrar(): ReglasPorCampo {
    return {
      clienta_id: [requerido('Seleccione una clienta.')],
      pedido_id: [requerido('Seleccione un pedido.')],
      casillero_id: [requerido('Seleccione un casillero.')],
      fecha_almacenamiento: [fechaValida()],
      observaciones: [maxLong(500)],
    };
  }

  private reglasMover(): ReglasPorCampo {
    return {
      casillero_id: [requerido('Seleccione un casillero de destino.')],
      posicion: [entero()],
    };
  }

  abrirRegistrar(): void {
    this.formClientaId = null;
    this.formPedidoId = null;
    this.pedidos = [];
    this.cargandoPedidos = false;
    this.formCodigo = '';
    this.formCasilleroId = null;
    this.formPosicion = null;
    this.formFecha = new Date().toISOString().slice(0, 10);
    this.formEstado = 'Pendiente de entrega';
    this.formObservaciones = '';
    this.formImagen = null;
    this.autoCodigo = true;
    this.qClientas = '';
    this.cargarClientas('');
    this.mostrarModalRegistrar = true;
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

  cerrarRegistrar(): void {
    this.mostrarModalRegistrar = false;
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  cerrarMover(): void {
    this.mostrarModalMover = false;
    this.moverBolsa = null;
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

  onClientaCambio(): void {
    this.formPedidoId = null;
    this.pedidos = [];
    this.cargandoPedidos = false;
    if (this.formClientaId) {
      this.cargandoPedidos = true;
      this.api.getPedidos('', this.formClientaId, true).subscribe({
        next: (res) => {
          this.pedidos = res.data;
          this.cargandoPedidos = false;
        },
        error: (e) => {
          this.cargandoPedidos = false;
          this.errorModal = mensajeError(e);
        },
      });
    }
  }

  casilleroCapacidad(): number {
    const c = this.casilleros.find((x) => x.id === this.formCasilleroId);
    return c ? c.capacidad : 30;
  }

  onImagenSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      this.errorModal = 'El archivo debe ser una imagen (JPG, PNG, WEBP...).';
      input.value = '';
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      this.errorModal = 'La imagen no debe superar los 2 MB.';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.formImagen = String(reader.result);
      this.errorModal = '';
    };
    reader.readAsDataURL(archivo);
  }

  quitarImagen(): void {
    this.formImagen = null;
  }

  async abrirCamara(): Promise<void> {
    this.camaraError = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorModal = 'La cámara no está disponible en este navegador. Use "Seleccionar imagen".';
      return;
    }
    this.mostrarModalCamara = true;
    try {
      this.streamCamara = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      this.camaraActiva = true;
      setTimeout(() => {
        const video = document.getElementById('videoCamara') as HTMLVideoElement | null;
        if (video && this.streamCamara) {
          video.srcObject = this.streamCamara;
          video.play().catch(() => undefined);
        }
      }, 100);
    } catch {
      this.camaraActiva = false;
      this.errorModal = 'No se pudo acceder a la cámara. Permita el acceso en el navegador o use "Seleccionar imagen".';
      this.mostrarModalCamara = false;
    }
  }

  capturarFoto(): void {
    const video = document.getElementById('videoCamara') as HTMLVideoElement | null;
    if (!video || !this.streamCamara) return;
    let ancho = video.videoWidth;
    let alto = video.videoHeight;
    if (!ancho || !alto) {
      this.camaraError = 'La cámara aún no está lista. Intente de nuevo.';
      return;
    }
    const maxLado = 1280;
    const escala = Math.min(1, maxLado / Math.max(ancho, alto));
    ancho = Math.round(ancho * escala);
    alto = Math.round(alto * escala);
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, ancho, alto);
    let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (dataUrl.length > 3300000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    }
    this.formImagen = dataUrl;
    this.errorModal = '';
    this.cerrarCamara();
  }

  cerrarCamara(): void {
    if (this.streamCamara) {
      this.streamCamara.getTracks().forEach((t) => t.stop());
      this.streamCamara = null;
    }
    this.camaraActiva = false;
    this.mostrarModalCamara = false;
    this.camaraError = '';
  }

  registrar(): void {
    if (this.guardando) return;
    this.error = '';
    this.errorModal = '';
    this.intentado = true;
    const res = validarTodo(
      {
        clienta_id: this.formClientaId,
        pedido_id: this.formPedidoId,
        casillero_id: this.formCasilleroId,
        fecha_almacenamiento: this.formFecha,
        observaciones: this.formObservaciones.trim(),
      },
      this.reglasRegistrar()
    );
    this.errores = res.errores;
    if (!res.ok) return;
    const payload: any = {
      clienta_id: this.formClientaId,
      pedido_id: this.formPedidoId,
      casillero_id: this.formCasilleroId,
      posicion: this.formPosicion,
      fecha_almacenamiento: this.formFecha,
      estado: this.formEstado,
      observaciones: this.formObservaciones.trim() || null,
      imagen: this.formImagen,
    };
    if (!this.autoCodigo) {
      payload.codigo = this.formCodigo.trim() || null;
    }

    this.guardando = true;
    this.api.createBolsa(payload).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cerrarRegistrar();
        this.cargar();
        this.api.getCasilleros(true).subscribe((r) => (this.casilleros = r.data));
      },
      error: (e) => aplicarErrorFormulario(e, this),
    });
  }

  entregar(b: Bolsa): void {
    if (!confirm(`¿Entregar la bolsa ${b.codigo} a ${b.clienta?.nombre}?\nSe liberará la posición del casillero.`)) return;
    this.api.entregarBolsa(b.id).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
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
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  mover(): void {
    if (this.guardando) return;
    this.error = '';
    this.errorModal = '';
    if (!this.moverBolsa) return;
    this.intentado = true;
    const res = validarTodo(
      {
        casillero_id: this.moverCasilleroId,
        posicion: this.moverPosicion,
      },
      this.reglasMover()
    );
    this.errores = res.errores;
    if (!res.ok) return;
    if (!this.moverCasilleroId) {
      this.errorModal = 'Seleccione un casillero de destino.';
      return;
    }
    this.guardando = true;
    this.api.moverBolsa(this.moverBolsa.id, this.moverCasilleroId, this.moverPosicion).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cerrarMover();
        this.cargar();
        this.api.getCasilleros(true).subscribe((r) => (this.casilleros = r.data));
      },
      error: (e) => aplicarErrorFormulario(e, this),
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
        this.mostrarMensaje(res.message);
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

  fmtFecha(s: string | null): string {
    if (!s) return '—';
    const solo = String(s).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(solo)) {
      const [y, m, d] = solo.split('-');
      return `${d}/${m}/${y}`;
    }
    return String(s);
  }

  diasAlmacenada(): number {
    if (!this.detalle?.fecha_almacenamiento || this.detalle.estado === 'Entregada') return 0;
    const d = new Date(String(this.detalle.fecha_almacenamiento).slice(0, 10) + 'T12:00:00');
    if (isNaN(d.getTime())) return 0;
    return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
  }

  movIcon(t: string): string {
    switch (t) {
      case 'Almacenada': return 'bi-box-seam';
      case 'Entregada': return 'bi-person-check';
      default: return 'bi-arrows-move';
    }
  }

  movClass(t: string): string {
    switch (t) {
      case 'Almacenada': return 'bg-emerald-100 text-emerald-600';
      case 'Entregada': return 'bg-fuchsia-100 text-fuchsia-600';
      default: return 'bg-sky-100 text-sky-600';
    }
  }

  movUbicacion(m: any): string {
    const antes = m.casillero_origen ? `${m.casillero_origen.codigo} / ${this.pad(m.posicion_origen)}` : '';
    const despues = m.casillero_destino ? `${m.casillero_destino.codigo} / ${this.pad(m.posicion_destino)}` : '';
    if (antes && despues) return `Desde ${antes} → Hacia ${despues}`;
    if (despues) return `Almacenada en ${despues}`;
    if (antes) return `Entregada desde ${antes}`;
    return '';
  }
}