<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PedidoRequest;
use App\Models\Pedido;
use App\Models\Venta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Pedido::with('clienta:id,nombre')->latest();

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

        $pedidos = $query->with(['clienta', 'ventas' => fn ($q) => $q->orderByDesc('id')])->paginate(50);

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

        return response()->json($pedidos);
    }

    public function store(PedidoRequest $request): JsonResponse
    {
        $data = $request->validated();

        $data['codigo'] = $data['codigo'] ?? $this->generarCodigo();
        $data['fecha'] = $data['fecha'] ?? now()->toDateString();
        $data['estado'] = $data['estado'] ?? 'Pendiente';

        $pedido = Pedido::create($data);

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

    private function generarCodigo(): string
    {
        $ultimo = Pedido::latest('id')->value('codigo');
        $numero = $ultimo ? ((int) substr($ultimo, -3)) + 1 : 1;

        return 'VF-' . str_pad((string) $numero, 3, '0', STR_PAD_LEFT);
    }
}