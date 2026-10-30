<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PedidoRequest;
use App\Models\Pedido;
use App\Models\Venta;
use App\Support\CodigoAutomatico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Pedido::with('clienta:id,nombre');

        if ($request->has('q') && $request->input('q') !== '') {
            $q = trim((string) $request->input('q'));
            $query->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhereHas('clienta', fn ($c) => $c->where('nombre', 'like', "%{$q}%"));
            });
        }

        if ($request->has('clienta_id') && $request->input('clienta_id')) {
            $query->where('clienta_id', $request->input('clienta_id'));
        }

        if ($request->boolean('disponibles')) {
            $query->whereDoesntHave('bolsas');
        }

        $tab = $request->input('tab', 'pendientes');
        if ($tab === 'pendientes') {
            $query->where('estado', 'Pendiente');
        } elseif ($tab === 'completados') {
            $query->where('estado', 'Completado');
        }

        if ($request->has('mes') && $request->input('mes')) {
            $mes = (int) $request->input('mes');
            if ($mes >= 1 && $mes <= 12) {
                $query->whereMonth('fecha', $mes);
            }
        }

        if ($request->has('anio') && $request->input('anio')) {
            $anio = (int) $request->input('anio');
            if ($anio > 0) {
                $query->whereYear('fecha', $anio);
            }
        }

        if ($request->has('cobro') && $request->input('cobro') !== '') {
            $cobro = $request->input('cobro');
            if ($cobro === 'cobrado') {
                $query->whereHas('ventas', function ($v) {
                    $v->where('estado', '!=', Venta::ESTADO_ANULADA);
                });
            } elseif ($cobro === 'por_cobrar') {
                $query->whereDoesntHave('ventas', function ($v) {
                    $v->where('estado', '!=', Venta::ESTADO_ANULADA);
                });
            }
        }

        $query->orderByDesc('fecha')->orderByDesc('id');

        $perPage = 10;
        $pedidos = $query->with(['clienta', 'ventas' => fn ($q) => $q->orderByDesc('id')])->paginate($perPage);

        $pedidos->getCollection()->transform(function (Pedido $pedido) {
            $ventaActiva = $pedido->ventas->firstWhere('estado', '!=', Venta::ESTADO_ANULADA);

            $pedido->setAttribute('venta_activa', $ventaActiva ? [
                'id' => $ventaActiva->id,
                'monto' => round((float) $ventaActiva->monto, 2),
                'fardo_id' => $ventaActiva->fardo_id,
                'fecha' => $ventaActiva->fecha?->format('Y-m-d'),
            ] : null);
            unset($pedido->ventas);

            return $pedido;
        });

        $baseQuery = Pedido::query();
        if ($request->has('q') && $request->input('q') !== '') {
            $q = trim((string) $request->input('q'));
            $baseQuery->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhereHas('clienta', fn ($c) => $c->where('nombre', 'like', "%{$q}%"));
            });
        }
        if ($request->has('clienta_id') && $request->input('clienta_id')) {
            $baseQuery->where('clienta_id', $request->input('clienta_id'));
        }
        if ($request->boolean('disponibles')) {
            $baseQuery->whereDoesntHave('bolsas');
        }
        if ($request->has('mes') && $request->input('mes')) {
            $mes = (int) $request->input('mes');
            if ($mes >= 1 && $mes <= 12) {
                $baseQuery->whereMonth('fecha', $mes);
            }
        }
        if ($request->has('anio') && $request->input('anio')) {
            $anio = (int) $request->input('anio');
            if ($anio > 0) {
                $baseQuery->whereYear('fecha', $anio);
            }
        }
        if ($request->has('cobro') && $request->input('cobro') !== '') {
            $cobro = $request->input('cobro');
            if ($cobro === 'cobrado') {
                $baseQuery->whereHas('ventas', function ($v) {
                    $v->where('estado', '!=', Venta::ESTADO_ANULADA);
                });
            } elseif ($cobro === 'por_cobrar') {
                $baseQuery->whereDoesntHave('ventas', function ($v) {
                    $v->where('estado', '!=', Venta::ESTADO_ANULADA);
                });
            }
        }

        $pendientes = (clone $baseQuery)->where('estado', 'Pendiente')->count();
        $completados = (clone $baseQuery)->where('estado', 'Completado')->count();
        $todos = (clone $baseQuery)->count();

        $response = $pedidos->toArray();
        $response['contadores'] = [
            'pendientes' => $pendientes,
            'completados' => $completados,
            'todos' => $todos,
        ];

        return response()->json($response);
    }

    public function store(PedidoRequest $request): JsonResponse
    {
        $data = $request->validated();
        $codigoManual = $data['codigo'] ?? null;
        unset($data['codigo']);

        $data['fecha'] = $data['fecha'] ?? now()->toDateString();
        $data['estado'] = $data['estado'] ?? 'Pendiente';

        $pedido = $codigoManual
            ? Pedido::create(['codigo' => $codigoManual] + $data)
            : CodigoAutomatico::crear(
                Pedido::class,
                'VF',
                3,
                fn (string $codigo) => Pedido::create(['codigo' => $codigo] + $data)
            );

        return response()->json(['data' => $pedido->load('clienta'), 'message' => 'Pedido registrado.'], 201);
    }

    public function show(Pedido $pedido): JsonResponse
    {
        $pedido->load(['clienta', 'bolsas' => fn ($q) => $q->with('casillero')->latest()]);

        return response()->json(['data' => $pedido]);
    }

    public function update(PedidoRequest $request, Pedido $pedido): JsonResponse
    {
        $data = $request->validated();

        $pedido->update($data);

        return response()->json(['data' => $pedido->load('clienta'), 'message' => 'Pedido actualizado.']);
    }

    public function destroy(Pedido $pedido): JsonResponse
    {
        if ($pedido->bolsas()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar el pedido porque tiene bolsas asociadas.',
            ], 422);
        }

        $pedido->delete();

        return response()->json(['message' => 'Pedido eliminado.']);
    }

}