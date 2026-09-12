import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { validarTodo, errVisible, requerido, emailOk, minLong, ReglasPorCampo } from '../utils/validators';

@Component({
    selector: 'app-login',
    imports: [FormsModule],
    templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  mostrarPassword = false;
  cargando = false;
  error = '';
  errores: Record<string, string> = {};
  intentado = false;
  errVisible = errVisible;

  private reglasLogin: ReglasPorCampo = {
    email: [requerido(), emailOk()],
    password: [requerido('La contraseña es obligatoria.'), minLong(6)],
  };

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = '';
    this.intentado = true;
    const res = validarTodo({ email: this.email, password: this.password }, this.reglasLogin);
    this.errores = res.errores;
    if (!res.ok) return;

    if (!this.email.trim() || !this.password) {
      this.error = 'Ingresa tu correo y contraseña.';
      return;
    }
    this.cargando = true;
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.cargando = false;
        if (e?.status === 422) {
          this.errores = Object.fromEntries(
            Object.entries((e as any)?.error?.errors || {}).map(([c, msgs]) => [
              c,
              Array.isArray(msgs) ? msgs[0] : String(msgs),
            ])
          ) as Record<string, string>;
          this.intentado = true;
          return;
        }
        this.error =
          e?.error?.errors?.email?.[0] ||
          e?.error?.message ||
          'No se pudo iniciar sesión. Verifica tus credenciales.';
      },
    });
  }
}