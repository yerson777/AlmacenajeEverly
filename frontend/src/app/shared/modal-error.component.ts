import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-error',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (message) {
      <div role="alert" class="flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <span class="min-w-0 break-words">{{ message }}</span>
        <button
          type="button"
          class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
          (click)="closed.emit()"
        >Cerrar</button>
      </div>
    }
  `,
})
export class ModalErrorComponent {
  @Input() message = '';
  @Output() closed = new EventEmitter<void>();
}
