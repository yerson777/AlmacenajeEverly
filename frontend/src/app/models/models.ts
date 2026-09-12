export interface Casillero {
  id: number;
  codigo: string;
  descripcion: string | null;
  capacidad: number;
  activo: boolean;
  bolsas_activas: number;
  espacios_disponibles: number;
  estado: 'Disponible' | 'Casi lleno' | 'Lleno';
}

export interface CasilleroPosicion {
  posicion: number;
  ocupada: boolean;
  bolsa?: { id: number; codigo: string; posicion: number; clienta_id: number } | null;
}

export interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string | null;
}

export interface Clienta {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  pedidos_count?: number;
  pedidos?: Pedido[];
  bolsas?: Bolsa[];
}

export interface Pedido {
  id: number;
  clienta_id: number;
  codigo?: string;
  fecha: string | null;
  total: string | number | null;
  estado: string;
  observaciones: string | null;
  clienta?: { id: number; nombre: string };
  bolsas?: Bolsa[];
  venta_activa?: {
    id: number;
    monto: number;
    fardo_id: number | null;
    fecha: string | null;
  } | null;
}

export interface Bolsa {
  id: number;
  clienta_id: number;
  pedido_id: number;
  codigo: string;
  casillero_id: number | null;
  posicion: number | null;
  fecha_almacenamiento: string | null;
  estado: string;
  observaciones: string | null;
  imagen?: string | null;
  clienta?: { id: number; nombre: string; telefono: string | null };
  pedido?: { id: number; codigo: string };
  casillero?: { id: number; codigo: string } | null;
  movimientos?: Movimiento[];
}

export interface Movimiento {
  id: number;
  bolsa_id: number;
  tipo: string;
  casillero_origen_id: number | null;
  posicion_origen: number | null;
  casillero_destino_id: number | null;
  posicion_destino: number | null;
  fecha: string;
  observaciones: string | null;
  bolsa?: { id: number; codigo: string };
  casillero_origen?: { id: number; codigo: string } | null;
  casillero_destino?: { id: number; codigo: string } | null;
}

export interface DashboardStats {
  total_clientas: number;
  bolsas_almacenadas: number;
  bolsas_pendientes: number;
  bolsas_entregadas: number;
  casilleros_disponibles: number;
  casilleros_llenos: number;
  espacios_disponibles: number;
}

export interface SerieCaja {
  etiqueta: string;
  fecha: string;
  ventas: number;
  cantidad: number;
}

export interface Fardo {
  id: number;
  codigo: string;
  categoria: string;
  descripcion: string | null;
  fecha_compra: string | null;
  capital_invertido: number;
  cantidad_prendas: number | null;
  estado: string;
  observaciones: string | null;
  ventas_acumuladas: number;
  capital_recuperado: number;
  capital_pendiente: number;
  ganancia: number;
  porcentaje_recuperacion: number;
  estado_recuperacion: string;
  ventas?: Venta[];
}

export interface Venta {
  id: number;
  fardo_id: number;
  clienta_id: number | null;
  pedido_id: number | null;
  monto: number;
  forma_pago: string;
  fecha: string;
  observaciones: string | null;
  estado: string;
  fardo?: { id: number; codigo: string; categoria: string } | null;
  clienta?: { id: number; nombre: string } | null;
  pedido?: { id: number; codigo: string } | null;
  codigo_pedido?: string | null;
  clienta_nombre?: string | null;
  fardo_codigo?: string | null;
  fardo_categoria?: string | null;
}

export interface FormaPagoResumen {
  total: number;
  cantidad: number;
}

export interface CajaStats {
  filtro: string;
  desde: string;
  hasta: string;
  ventas_hoy: number;
  ventas_semana: number;
  ventas_mes: number;
  global: {
    capital_invertido: number;
    capital_recuperado: number;
    capital_pendiente: number;
    ganancia: number;
    ventas: number;
    porcentaje_recuperacion: number;
    fardos: number;
    fardos_recuperados: number;
  };
  resumen: {
    ventas: number;
    ventas_count: number;
    pedidos_count: number;
    forma_pago: Record<string, FormaPagoResumen>;
  };
  fardos: Fardo[];
  ventas: Venta[];
  series: {
    diario: SerieCaja[];
    semanal: SerieCaja[];
    mensual: SerieCaja[];
  };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
}