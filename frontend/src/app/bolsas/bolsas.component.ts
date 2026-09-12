import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Bolsa, Casillero, Clienta, Pedido } from '../models/models';
import { validarTodo, errVisible, requerido, maxLong, fechaValida, entero, ReglasPorCampo } from '../utils/validators';

@Component({
    selector: 'app-bolsas',
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './bolsas.component.html'
})
export class BolsasComponent implements OnInit {
  bolsas: Bolsa[] = [];
  casilleros: Casillero[] = [];
  clientas: Clienta[] = [];
  pedidos: Pedido[] = [];
  q = '';
  error = '';
  mensaje = '';
  errores: Record<string, string> = {};
  intentado = false;
  errVisible = errVisible;

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

  onImagenSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      this.error = 'El archivo debe ser una imagen (JPG, PNG, WEBP…).';
      input.value = '';
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      this.error = 'La imagen no debe superar los 2 MB.';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.formImagen = String(reader.result);
      this.error = '';
    };
    reader.readAsDataURL(archivo);
  }

  quitarImagen(): void {
    this.formImagen = null;
  }

  async abrirCamara(): Promise<void> {
    this.camaraError = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.camaraError = 'La cámara no está disponible en este navegador. Use "Seleccionar imagen".';
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
      this.camaraError = 'No se pudo acceder a la cámara. Permita el acceso en el navegador o use "Seleccionar imagen".';
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
    this.error = '';
    this.cerrarCamara();
  }

  cerrarCamara(): void {
    if (this.streamCamara) {
      this.streamCamara.getTracks().forEach((t) => t.stop());
      this.streamCamara = null;
    }
    this.camaraActiva = false;
    this.mostrarModalCamara = false;
  }

  registrar(): void {
    this.error = '';
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

    this.api.createBolsa(payload).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.mostrarModalRegistrar = false;
        this.cargar();
        this.api.getCasilleros(true).subscribe((r) => (this.casilleros = r.data));
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
    this.errores = {};
    this.intentado = false;
  }

  mover(): void {
    this.error = '';
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