const PREFIJO = 'casillero_filtro_';

export type ModuloFiltros =
  | 'caja'
  | 'bolsas'
  | 'pedidos'
  | 'movimientos'
  | 'clientas'
  | 'casilleros'
  | 'dashboard';

export const FILTROS_POR_DEFECTO = {
  caja: {
    filtro: 'hoy',
    offsetPeriodo: 0,
    chartTab: 'dia',
    periodoLiquidacion: 'hoy',
    offsetLiquidacion: 0,
    tipoFardo: 'activos',
    busquedaFardo: '',
    vistaFardos: 'lista',
    paginaFardos: 1,
    paginaVentas: 1,
  },
  bolsas: {
    tab: 'pendientes',
    filtroMes: null,
    filtroAnio: null,
    filtroCasilleroId: null,
    filtroUbicacion: '',
    q: '',
    pagina: 1,
  },
  pedidos: {
    tab: 'pendientes',
    filtroMes: null,
    filtroAnio: null,
    filtroCobro: '',
    q: '',
    pagina: 1,
  },
  movimientos: {
    filtroTipo: '',
    q: '',
    pagina: 1,
  },
  clientas: {
    q: '',
    pagina: 1,
  },
  casilleros: {
    pagina: 1,
  },
  dashboard: {
    q: '',
    paginaPendientes: 1,
  },
};

const CLAVES_PERSISTIDAS: Record<ModuloFiltros, readonly string[]> = {
  caja: [
    'caja_filtro',
    'caja_desde',
    'caja_hasta',
    'caja_chart_tab',
    'caja_periodo_liquidacion',
    'caja_vista_fardos',
  ],
  bolsas: ['bolsas_filtros'],
  pedidos: ['pedidos_filtros'],
  movimientos: ['movimientos_filtro'],
  clientas: ['clientas_filtros'],
  casilleros: [],
  dashboard: [],
};

export function limpiarFiltrosModulo(modulo: ModuloFiltros): void {
  for (const clave of CLAVES_PERSISTIDAS[modulo]) {
    try {
      localStorage.removeItem(clave);
      localStorage.removeItem(PREFIJO + clave);
    } catch {
      // localStorage puede no estar disponible.
    }
  }
}

export function aplicarFiltrosPorDefecto(destino: object, modulo: ModuloFiltros): void {
  Object.assign(destino, FILTROS_POR_DEFECTO[modulo]);
}

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
