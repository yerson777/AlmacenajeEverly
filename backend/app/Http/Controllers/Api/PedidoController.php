<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Pedido::with('clienta:id,nombre')->latest();

        if ($request->has('q') && $request->input('q') !== '') {
            $q = $request->input('q');
            $query->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhereHas('clienta', fn ($c) => $c->where('nombre', 'like', "%{$q}%"));
            });
        }

        if ($request->has('clienta_id') && $request->input('clienta_id')) {
            $query->where('clienta_id', $request->input('clienta_id'));
        }

        $pedidos = $query->paginate(50);

        return response()->json($pedidos);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'clienta_id' => 'required|exists:clientas,id',
            'codigo' => 'nullable|string|max:20|unique:pedidos,codigo',
            'fecha' => 'nullable|date',
            'total' => 'nullable|numeric|min:0',
            'estado' => 'nullable|string|max:50',
            'observaciones' => 'nullable|string|max:500',
        ]);

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

    public function update(Request $request, Pedido $pedido): JsonResponse
    {
        $data = $request->validate([
            'clienta_id' => 'sometimes|required|exists:clientas,id',
            'codigo' => 'nullable|string|max:20|unique:pedidos,codigo,' . $pedido->id,
            'fecha' => 'nullable|date',
            'total' => 'nullable|numeric|min:0',
            'estado' => 'nullable|string|max:50',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $pedido->update($data);

        return response()->json(['data' => $pedido->load('clienta'), 'message' => 'Pedido actualizado.']);
    }

    public function destroy(Pedido $pedido): JsonResponse
    {
        $pedido->delete();

        return response()->json(['message' => 'Pedido eliminado.']);
    }

    public function generarCodigo(): string
    {
        $ultimo = Pedido::latest('id')->value('codigo');
        $numero = $ultimo ? ((int) substr($ultimo, -3)) + 1 : 1;

        return 'VF-' . str_pad((string) $numero, 3, '0', STR_PAD_LEFT);
    }
}