<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bolsa;
use App\Models\Casillero;
use App\Models\Clienta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $totalClientas = Clienta::count();

        $bolsasAlmacenadas = Bolsa::where('estado', Bolsa::ESTADO_PENDIENTE)
            ->whereNotNull('posicion')
            ->count();

        $pendientesEntrega = Bolsa::where('estado', Bolsa::ESTADO_PENDIENTE)->count();
        $entregadas = Bolsa::where('estado', Bolsa::ESTADO_ENTREGADA)->count();

        $casilleros = Casillero::withCount([
            'bolsas as bolsas_activas' => fn ($q) => $q->where('estado', Bolsa::ESTADO_PENDIENTE)->whereNotNull('posicion'),
        ])->get();

        $casillerosDisponibles = $casilleros->filter(fn ($c) => $c->bolsas_activas === 0)->count();
        $casillerosLlenos = $casilleros->filter(fn ($c) => $c->bolsas_activas >= $c->capacidad)->count();
        $espaciosDisponibles = $casilleros->sum(fn ($c) => max(0, $c->capacidad - $c->bolsas_activas));

        return response()->json([
            'data' => [
                'total_clientas' => $totalClientas,
                'bolsas_almacenadas' => $bolsasAlmacenadas,
                'bolsas_pendientes' => $pendientesEntrega,
                'bolsas_entregadas' => $entregadas,
                'casilleros_disponibles' => $casillerosDisponibles,
                'casilleros_llenos' => $casillerosLlenos,
                'espacios_disponibles' => $espaciosDisponibles,
            ],
        ]);
    }

    public function pendientes(): JsonResponse
    {
        $pendientes = Bolsa::with(['clienta:id,nombre,telefono', 'pedido:id,codigo', 'casillero:id,codigo'])
            ->where('estado', Bolsa::ESTADO_PENDIENTE)
            ->whereNotNull('posicion')
            ->orderBy('casillero_id')
            ->orderBy('posicion')
            ->get();

        return response()->json(['data' => $pendientes]);
    }

    public function buscar(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q', ''));

        if ($q === '') {
            return response()->json(['data' => []]);
        }

        $clientas = Clienta::where('nombre', 'like', "%{$q}%")
            ->orWhere('telefono', 'like', "%{$q}%")
            ->pluck('id');

        $bolsas = Bolsa::with(['clienta:id,nombre,telefono', 'pedido:id,codigo', 'casillero:id,codigo'])
            ->where(function ($query) use ($q, $clientas) {
                $query->where('codigo', 'like', "%{$q}%")
                    ->orWhereIn('clienta_id', $clientas)
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', "%{$q}%"));
            })
            ->orderByDesc('estado')
            ->limit(50)
            ->get();

        return response()->json(['data' => $bolsas]);
    }
}