<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Movimiento;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovimientoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q', ''));
        $tipo = (string) $request->input('tipo', '');
        $bolsaId = $request->input('bolsa_id');

        $query = Movimiento::with(['bolsa:id,codigo', 'casilleroOrigen:id,codigo', 'casilleroDestino:id,codigo']);
        $this->aplicarFiltros($query, $q, $bolsaId);

        if (in_array($tipo, [Movimiento::TIPO_ALMACENADA, Movimiento::TIPO_ENTREGADA, Movimiento::TIPO_MOVIDA], true)) {
            $query->where('tipo', $tipo);
        }

        $query->orderByDesc('fecha')->orderByDesc('id');

        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $movimientos = $query->paginate($perPage);

        $baseQuery = Movimiento::query();
        $this->aplicarFiltros($baseQuery, $q, $bolsaId);

        $contadores = [
            'almacenadas' => (clone $baseQuery)->where('tipo', Movimiento::TIPO_ALMACENADA)->count(),
            'entregadas' => (clone $baseQuery)->where('tipo', Movimiento::TIPO_ENTREGADA)->count(),
            'movidas' => (clone $baseQuery)->where('tipo', Movimiento::TIPO_MOVIDA)->count(),
            'todos' => (clone $baseQuery)->count(),
        ];

        $response = $movimientos->toArray();
        $response['contadores'] = $contadores;

        return response()->json($response);
    }

    private function aplicarFiltros(Builder $query, string $q, mixed $bolsaId): void
    {
        if ($q !== '') {
            $query->whereHas('bolsa', fn ($b) => $b->where('codigo', 'like', "%{$q}%"));
        }

        if ($bolsaId) {
            $query->where('bolsa_id', $bolsaId);
        }
    }
}
