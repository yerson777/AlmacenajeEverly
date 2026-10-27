import { Observable, Subscription, finalize } from 'rxjs';

interface Callbacks<T> {
  next: (valor: T) => void;
  error: (error: unknown) => void;
  finalizar?: () => void;
}

export class PeticionCancelable {
  private sub?: Subscription;
  private token = 0;

  ejecutar<T>(peticion: Observable<T>, callbacks: Callbacks<T>): void {
    this.cancelar();
    const token = this.token;

    this.sub = peticion
      .pipe(
        finalize(() => {
          if (token !== this.token) return;
          this.sub = undefined;
          callbacks.finalizar?.();
        })
      )
      .subscribe({
        next: (valor) => {
          if (token === this.token) callbacks.next(valor);
        },
        error: (error) => {
          if (token === this.token) callbacks.error(error);
        },
      });
  }

  cancelar(): void {
    this.token++;
    this.sub?.unsubscribe();
    this.sub = undefined;
  }
}
