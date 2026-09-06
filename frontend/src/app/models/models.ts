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

export interface Paginated<T> {
  data: T[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
}