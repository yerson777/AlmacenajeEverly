<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VentaRequest;
use App\Models\Fardo;
use App\Models\Venta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VentaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Venta::with(['fardo:id,codigo,categoria', 'clienta:id,nombre', 'pedido:id,codigo']);

        if ($request->has('fardo_id') && $request->input('fardo_id')) {
            $query->where('fardo_id', $request->input('fardo_id'));
        }

        if ($request->has('forma_pago') && $request->input('forma_pago')) {
            $query->where('forma_pago', $request->input('forma_pago'));
        }

        if ($request->has('desde') && $request->input('desde')) {
            $query->where('fecha', '>=', $request->input('desde'));
        }

        if ($request->has('hasta') && $request->input('hasta')) {
            $query->where('fecha', '<=', $request->input('hasta'));
        }

        $ventas = $query->orderByDesc('fecha')->orderByDesc('id')->paginate(100);

        return response()->json($ventas);
    }

    public function store(VentaRequest $request): JsonResponse
    {
        $data = $request->validated();

        $this->asegurarSinVentaActiva($data['pedido_id'] ?? null);
        $this->asegurarFardoVendible($data['fardo_id']);

        $data['estado'] = Venta::ESTADO_PAGADA;

        $venta = Venta::create($data);

        return response()->json(['data' => $venta->load(['fardo:id,codigo,categoria', 'clienta:id,nombre', 'pedido:id,codigo']), 'message' => 'Venta registrada.'], 201);
    }

    public function update(VentaRequest $request, Venta $venta): JsonResponse
    {
        if ($venta->estado === Venta::ESTADO_ANULADA) {
            return response()->json(['message' => 'No se puede modificar una venta anulada.'], 422);
        }

        $data = $request->validated();

        if (isset($data['fardo_id'])) {
            $this->asegurarFardoVendible($data['fardo_id']);
        }

        $venta->update($data);

        return response()->json(['data' => $venta->refresh()->load(['fardo:id,codigo,categoria', 'clienta:id,nombre', 'pedido:id,codigo']), 'message' => 'Venta actualizada.']);
    }

    public function anular(Venta $venta): JsonResponse
    {
        if ($venta->estado === Venta::ESTADO_ANULADA) {
            return response()->json(['message' => 'La venta ya estaba anulada.']);
        }

        $venta->update(['estado' => Venta::ESTADO_ANULADA]);

        return response()->json(['data' => $venta->refresh(), 'message' => 'Venta anulada.']);
    }

    public function destroy(Venta $venta): JsonResponse
    {
        $venta->delete();

        return response()->json(['message' => 'Venta eliminada.']);
    }

    private function asegurarFardoVendible(int $fardoId): void
    {
        $fardo = Fardo::find($fardoId);

        if (! $fardo) {
            throw ValidationException::withMessages([
                'fardo_id' => 'El fardo seleccionado no existe.',
            ]);
        }

        if ($fardo->estado !== 'En venta') {
            throw ValidationException::withMessages([
                'fardo_id' => 'No se puede vender de un fardo ' . strtolower($fardo->estado) . '.',
            ]);
        }
    }

    private function asegurarSinVentaActiva(?int $pedidoId): void
    {
        if (! $pedidoId) {
            return;
        }

        $yaTiene = Venta::where('pedido_id', $pedidoId)
            ->where('estado', '!=', Venta::ESTADO_ANULADA)
            ->exists();

        if ($yaTiene) {
            throw ValidationException::withMessages([
                'pedido_id' => 'Este pedido ya tiene una venta confirmada. Si cambió el monto del pedido, vuelva a confirmar aquí para actualizarla (no se duplicará en caja).',
            ]);
        }
    }
}