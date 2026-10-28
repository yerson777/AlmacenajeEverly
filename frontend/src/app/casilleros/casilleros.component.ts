import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Casillero, CasilleroPosicion } from '../models/models';
import { ModalErrorComponent } from '../shared/modal-error.component';
import { aplicarErrorFormulario } from '../utils/api-errors';
import { validarTodo, errVisible, requerido, noSoloEspacios, maxLong, entero, positivo, ReglasPorCampo } from '../utils/validators';
import { autoDismiss } from '../utils/auto-dismiss';

@Component({
    selector: 'app-casilleros',
    imports: [FormsModule, ModalErrorComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './casilleros.component.html'
})
export class CasillerosComponent implements OnInit {
  casilleros: Casillero[] = [];
  posiciones: CasilleroPosicion[] = [];
  pagina = 1;
  porPagina = 9;
  casilleroSeleccionado: Casillero | null = null;
  error = '';
  errorModal = '';
  mensaje = '';
  private mostrarMensaje = autoDismiss((m) => (this.mensaje = m));

  mostrarModal = false;
  editando = false;
  formCodigo = '';
  formDescripcion = '';
  formCapacidad = 30;
  formActivo = true;
  errores: Record<string, string> = {};
  intentado = false;
  guardando = false;
  errVisible = errVisible;

  private reglas(): ReglasPorCampo {
    return {
      codigo: [requerido(), noSoloEspacios(), maxLong(20)],
      descripcion: [maxLong(255)],
      capacidad: [entero(), positivo()],
    };
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  get casillerosPaginados(): Casillero[] {
    const inicio = (this.pagina - 1) * this.porPagina;
    return this.casilleros.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.casilleros.length / this.porPagina));
  }

  get mostrarPaginacion(): boolean {
    return this.casilleros.length > this.porPagina;
  }

  get paginaActual(): number {
    if (this.pagina > this.totalPaginas) this.pagina = this.totalPaginas;
    if (this.pagina < 1) this.pagina = 1;
    return this.pagina;
  }

  cambiarPagina(delta: number): void {
    const nueva = this.pagina + delta;
    if (nueva < 1 || nueva > this.totalPaginas) return;
    this.pagina = nueva;
  }

  cargar(): void {
    this.pagina = 1;
    this.api.getCasilleros().subscribe({
      next: (res) => {
        this.casilleros = res.data;
        if (this.pagina > this.totalPaginas) this.pagina = this.totalPaginas || 1;
        if (this.pagina < 1) this.pagina = 1;
      },
      error: (e) => (this.error = e.message),
    });
  }

  badgeEstado(estado: string): string {
    if (estado === 'Lleno') return 'bg-red-600 text-white';
    if (estado === 'Casi lleno') return 'bg-amber-400 text-amber-950';
    return 'bg-emerald-600 text-white';
  }

  abrirCrear(): void {
    this.editando = false;
    this.formCodigo = '';
    this.formDescripcion = '';
    this.formCapacidad = 30;
    this.formActivo = true;
    this.mostrarModal = true;
    this.error = '';
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
  }

  abrirEditar(c: Casillero): void {
    this.editando = true;
    this.formCodigo = c.codigo;
    this.formDescripcion = c.descripcion ?? '';
    this.formCapacidad = c.capacidad;
    this.formActivo = c.activo;
    this.mostrarModal = true;
    this.error = '';
    this.errorModal = '';
    this.errores = {};
    this.intentado = false;
    this.guardando = false;
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
        codigo: this.formCodigo,
        descripcion: this.formDescripcion,
        capacidad: this.formCapacidad,
      },
      this.reglas()
    );
    this.errores = res.errores;
    if (!res.ok) return;

    const payload = {
      codigo: this.formCodigo.trim(),
      descripcion: this.formDescripcion.trim() || null,
      capacidad: this.formCapacidad,
      activo: this.formActivo,
    };
    const request = this.editando
      ? this.api.updateCasillero(this.casilleroSeleccionado!.id, payload)
      : this.api.createCasillero(payload);

    this.guardando = true;
    request.subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.cerrarModal();
        const estabaEnUltima = this.pagina >= this.totalPaginas;
        this.api.getCasilleros().subscribe({
          next: (r) => {
            this.casilleros = r.data;
            if (this.editando) {
              if (this.pagina > this.totalPaginas) this.pagina = this.totalPaginas || 1;
              if (this.pagina < 1) this.pagina = 1;
            } else {
              if (estabaEnUltima || this.casilleros.length <= this.porPagina) {
                this.pagina = this.totalPaginas || 1;
              } else {
                this.pagina = this.totalPaginas || 1;
              }
              if (this.pagina < 1) this.pagina = 1;
            }
          },
          error: (e) => (this.error = e.message),
        });
      },
      error: (e) => aplicarErrorFormulario(e, this),
    });
  }

  prepararEdicion(c: Casillero): void {
    this.casilleroSeleccionado = c;
    this.abrirEditar(c);
  }

  cambiarEstado(c: Casillero): void {
    this.api.setCasilleroEstado(c.id, !c.activo).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.api.getCasilleros().subscribe({
          next: (r) => {
            this.casilleros = r.data;
            if (this.pagina > this.totalPaginas) this.pagina = this.totalPaginas || 1;
            if (this.pagina < 1) this.pagina = 1;
          },
          error: (e) => (this.error = e.message),
        });
      },
      error: (e) => (this.error = e.message),
    });
  }

  eliminar(c: Casillero): void {
    if (!confirm(`¿Eliminar el casillero ${c.codigo}?`)) return;
    const paginaAntes = this.pagina;
    this.api.deleteCasillero(c.id).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message);
        this.api.getCasilleros().subscribe({
          next: (r) => {
            this.casilleros = r.data;
            const total = this.totalPaginas;
            if (this.casilleros.length === 0) {
              this.pagina = 1;
              return;
            }
            if (paginaAntes > total) {
              this.pagina = total;
            } else if (paginaAntes < 1) {
              this.pagina = 1;
            } else {
              this.pagina = paginaAntes;
            }
            if (this.pagina > this.totalPaginas) this.pagina = this.totalPaginas;
            if (this.pagina < 1) this.pagina = 1;
          },
          error: (e) => (this.error = e.message),
        });
      },
      error: (e) => (this.error = e.message),
    });
  }

  verPosiciones(c: Casillero): void {
    this.casilleroSeleccionado = c;
    this.posiciones = [];
    this.api.getPosiciones(c.id).subscribe({
      next: (res) => (this.posiciones = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  cerrarPosiciones(): void {
    this.posiciones = [];
    this.casilleroSeleccionado = null;
  }
}