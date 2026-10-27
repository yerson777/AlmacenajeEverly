import { DestroyRef, inject } from '@angular/core';

export function autoDismiss(
  setMessage: (message: string) => void,
  delay = 5000
): (message: string) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const destroyRef = inject(DestroyRef);

  destroyRef.onDestroy(() => {
    if (timer) clearTimeout(timer);
  });

  return (message: string) => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    setMessage(message);

    if (!message) return;

    timer = setTimeout(() => {
      timer = undefined;
      setMessage('');
    }, delay);
  };
}
