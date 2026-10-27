const PREFIJO = 'casillero_filtro_';

function urlActual(): URL {
  return new URL(window.location.href);
}

export function leerPreferencia<T extends string>(
  clave: string,
  permitidos: readonly T[],
  porDefecto: T
): T {
  try {
    const guardado = localStorage.getItem(PREFIJO + clave);
    if (guardado !== null && permitidos.includes(guardado as T)) return guardado as T;
  } catch {
    // localStorage puede no estar disponible.
  }
  return porDefecto;
}

export function recordarPreferencia(clave: string, valor: string): void {
  try {
    localStorage.setItem(PREFIJO + clave, valor);
  } catch {
    // localStorage puede no estar disponible.
  }
}

export function leerFiltro<T extends string>(
  clave: string,
  permitidos: readonly T[],
  porDefecto: T
): T {
  const enUrl = urlActual().searchParams.get(clave);
  if (enUrl !== null && permitidos.includes(enUrl as T)) return enUrl as T;
  return leerPreferencia(clave, permitidos, porDefecto);
}

export function leerValorFiltro(clave: string): string | null {
  const enUrl = urlActual().searchParams.get(clave);
  if (enUrl !== null) return enUrl;

  try {
    return localStorage.getItem(PREFIJO + clave);
  } catch {
    return null;
  }
}

export function guardarFiltro(
  clave: string,
  valor: string,
  extras: Record<string, string | null> = {}
): void {
  const url = urlActual();

  if (valor) {
    url.searchParams.set(clave, valor);
  } else {
    url.searchParams.delete(clave);
  }

  for (const [nombre, contenido] of Object.entries(extras)) {
    if (contenido) {
      url.searchParams.set(nombre, contenido);
    } else {
      url.searchParams.delete(nombre);
    }
  }

  history.replaceState(history.state, '', url);
  recordarPreferencia(clave, valor);

  for (const [nombre, contenido] of Object.entries(extras)) {
    if (contenido) {
      recordarPreferencia(nombre, contenido);
    } else {
      try {
        localStorage.removeItem(PREFIJO + nombre);
      } catch {
        // localStorage puede no estar disponible.
      }
    }
  }
}
