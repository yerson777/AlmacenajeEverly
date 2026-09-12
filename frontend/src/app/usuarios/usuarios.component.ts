import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Usuario } from '../models/models';
import { validarTodo, errVisible, requerido, emailOk, maxLong, minLong, Validator, ReglasPorCampo } from '../utils/validators';

@Component({
    selector: 'app-usuarios',
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './usuarios.component.html'
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  error = '';
  mensaje = '';

  mostrarModal = false;
  editando = false;
  usuarioActual: Usuario | null = null;
  formNombre = '';
  formEmail = '';
  formRol = 'administrador';
  formPassword = '';
  formPassword2 = '';
  verPassword = false;
  verPassword2 = false;
  cargando = false;
  errores: Record<string, string> = {};
  intentado = false;
  errVisible = errVisible;

  roles = [
    { value: 'super_admin', label: 'Super administrador' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'cajera', label: 'Cajera' },
    { value: 'consulta', label: 'Solo lectura' },
  ];

  private confirmarRegla(): Validator {
    return (v) => {
      const vacio = String(v ?? '').trim() === '';
      if (vacio && (this.formPassword.trim() !== '' || !this.editando)) {
        return 'Debe confirmar la contraseña.';
      }
      if (!vacio && this.formPassword && v !== this.formPassword) {
        return 'Las contraseñas no coinciden.';
      }
      return null;
    };
  }

  private reglas(): ReglasPorCampo {
    const base: ReglasPorCampo = {
      name: [requerido(), maxLong(255)],
      email: [requerido(), emailOk(), maxLong(255)],
      role: [requerido()],
    };
    if (this.editando) {
      return {
        ...base,
        password: [minLong(8)],
        confirmar_password: [this.confirmarRegla()],
      };
    }
    return {
      ...base,
      password: [requerido('La contraseña es obligatoria.'), minLong(8)],
      confirmar_password: [this.confirmarRegla()],
    };
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.getUsuarios().subscribe({
      next: (res) => (this.usuarios = res.data),
      error: (e) => (this.error = e.message),
    });
  }

  abrirCrear(): void {
    this.editando = false;
    this.usuarioActual = null;
    this.formNombre = '';
    this.formEmail = '';
    this.formRol = 'administrador';
    this.formPassword = '';
    this.formPassword2 = '';
    this.verPassword = false;
    this.verPassword2 = false;
    this.mostrarModal = true;
    this.error = '';
    this.errores = {};
    this.intentado = false;
  }

  abrirEditar(u: Usuario): void {
    this.editando = true;
    this.usuarioActual = u;
    this.formNombre = u.name;
    this.formEmail = u.email;
    this.formRol = u.role;
    this.formPassword = '';
    this.formPassword2 = '';
    this.verPassword = false;
    this.verPassword2 = false;
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
        name: this.formNombre,
        email: this.formEmail,
        password: this.formPassword,
        confirmar_password: this.formPassword2,
        role: this.formRol,
      },
      this.reglas()
    );
    this.errores = res.errores;
    if (!res.ok) return;

    const nombre = this.formNombre.trim();
    const email = this.formEmail.trim();

    if (!nombre) {
      this.error = 'El nombre es obligatorio.';
      return;
    }
    if (!email) {
      this.error = 'El correo electrónico es obligatorio.';
      return;
    }
    if (!this.editando && this.formPassword.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.formPassword && this.formPassword !== this.formPassword2) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    const payload: any = {
      name: nombre,
      email,
      role: this.formRol,
    };
    if (this.formPassword) {
      payload.password = this.formPassword;
      payload.password_confirmation = this.formPassword2;
    }

    this.cargando = true;
    const request = this.editando && this.usuarioActual
      ? this.api.updateUsuario(this.usuarioActual.id, payload)
      : this.api.createUsuario(payload);

    request.subscribe({
      next: (res) => {
        this.cargando = false;
        this.mensaje = res.message;
        this.mostrarModal = false;
        this.cargar();
      },
      error: (e) => {
        this.cargando = false;
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

  eliminar(u: Usuario): void {
    if (!confirm(`¿Eliminar el usuario "${u.name}" (${u.email})?`)) return;
    this.api.deleteUsuario(u.id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargar();
      },
      error: (e) => (this.error = e.message),
    });
  }

  rolLabel(v: string): string {
    return this.roles.find((r) => r.value === v)?.label ?? v;
  }

  rolClass(v: string): string {
    switch (v) {
      case 'super_admin': return 'bg-fuchsia-100 text-fuchsia-700';
      case 'administrador': return 'bg-sky-100 text-sky-700';
      case 'cajera': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  iniciales(nombre: string): string {
    return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  fmtFecha(s: string | null | undefined): string {
    if (!s) return '—';
    const solo = String(s).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(solo)) {
      const [y, m, d] = solo.split('-');
      return `${d}/${m}/${y}`;
    }
    return String(s);
  }
}