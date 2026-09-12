import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Casillero, CasilleroPosicion } from '../models/models';
import { validarTodo, errVisible, requerido, noSoloEspacios, maxLong, entero, positivo, ReglasPorCampo } from '../utils/validators';

@Component({
  selector: 'app-casilleros',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './casilleros.component.html'
})
export class CasillerosComponent implements OnInit {
  casilleros: Casillero[] = [];
  posiciones: CasilleroPosicion[] = [];
  casilleroSeleccionado: Casillero | null = null;
  error = '';
  mensaje = '';

  mostrarModal = false;
  editando = false;
  formCodigo = '';
  formDescripcion = '';
  formCapacidad = 30;
  formActivo = true;
  errores: Record<string, string> = {};
  intentado = false;
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

  cargar(): void {
    this.api.getCasilleros().subscribe({
      next: (res) => (this.casilleros = res.data),
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
    this.errores = {};
    this.intentado = false;
  }

  abrirEditar(c: Casillero): void {
    this.editando = true;
    this.formCodigo = c.codigo;
    this.formDescripcion = c.descripcion ?? '';
    this.formCapacidad = c.capacidad;
    this.formActivo = c.activo;
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

  prepararEdicion(c: Casillero): void {
    this.casilleroSeleccionado = c;
    this.abrirEditar(c);
  }

  cambiarEstado(c: Casillero): void {
    this.api.setCasilleroEstado(c.id, !c.activo).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  eliminar(c: Casillero): void {
    if (!confirm(`¿Eliminar el casillero ${c.codigo}?`)) return;
    this.api.deleteCasillero(c.id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargar();
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