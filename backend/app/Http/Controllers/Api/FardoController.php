<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FardoRequest;
use App\Models\Fardo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FardoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Fardo::query();

        if ($q = trim((string) $request->input('q', ''))) {
            $query->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhere('categoria', 'like', "%{$q}%")
                    ->orWhere('descripcion', 'like', "%{$q}%");
            });
        }

        $fardos = $query->orderByDesc('id')->get()->map(function ($fardo) {
            $resumen = $fardo->calcular();

            return [
                'id' => $fardo->id,
                'codigo' => $fardo->codigo,
                'categoria' => $fardo->categoria,
                'descripcion' => $fardo->descripcion,
                'fecha_compra' => $fardo->fecha_compra?->format('Y-m-d'),
                'capital_invertido' => round((float) $fardo->capital_invertido, 2),
                'cantidad_prendas' => $fardo->cantidad_prendas,
                'estado' => $fardo->estado,
                'observaciones' => $fardo->observaciones,
                'ventas_acumuladas' => round($resumen['ventas'], 2),
                'capital_recuperado' => round($resumen['capital_recuperado'], 2),
                'capital_pendiente' => round($resumen['capital_pendiente'], 2),
                'ganancia' => round($resumen['ganancia'], 2),
                'porcentaje_recuperacion' => $resumen['pct'],
                'estado_recuperacion' => $resumen['estado_recuperacion'],
            ];
        });

        return response()->json(['data' => $fardos]);
    }

    public function store(FardoRequest $request): JsonResponse
    {
        $data = $request->validated();

        $data['codigo'] = $data['codigo'] ?? $this->generarCodigo();
        $data['estado'] = $data['estado'] ?? 'En venta';

        $fardo = Fardo::create($data);

        return response()->json(['data' => $fardo->refresh(), 'message' => 'Fardo registrado.'], 201);
    }

    public function show(Fardo $fardo): JsonResponse
    {
        $fardo->load(['ventas' => fn ($q) => $q->with(['clienta:id,nombre', 'pedido:id,codigo'])->orderByDesc('fecha')->orderByDesc('id')]);

        $resumen = $fardo->calcular();

        return response()->json([
            'data' => [
                'id' => $fardo->id,
                'codigo' => $fardo->codigo,
                'categoria' => $fardo->categoria,
                'descripcion' => $fardo->descripcion,
                'fecha_compra' => $fardo->fecha_compra?->format('Y-m-d'),
                'capital_invertido' => round((float) $fardo->capital_invertido, 2),
                'cantidad_prendas' => $fardo->cantidad_prendas,
                'estado' => $fardo->estado,
                'observaciones' => $fardo->observaciones,
                'ventas_acumuladas' => round($resumen['ventas'], 2),
                'capital_recuperado' => round($resumen['capital_recuperado'], 2),
                'capital_pendiente' => round($resumen['capital_pendiente'], 2),
                'ganancia' => round($resumen['ganancia'], 2),
                'porcentaje_recuperacion' => $resumen['pct'],
                'estado_recuperacion' => $resumen['estado_recuperacion'],
                'ventas' => $fardo->ventas->map(fn ($v) => [
                    'id' => $v->id,
                    'fecha' => $v->fecha?->format('Y-m-d'),
                    'monto' => round((float) $v->monto, 2),
                    'forma_pago' => $v->forma_pago,
                    'estado' => $v->estado,
                    'observaciones' => $v->observaciones,
                    'clienta' => $v->clienta ? ['id' => $v->clienta->id, 'nombre' => $v->clienta->nombre] : null,
                    'pedido' => $v->pedido ? ['id' => $v->pedido->id, 'codigo' => $v->pedido->codigo] : null,
                ]),
            ],
        ]);
    }

    public function update(FardoRequest $request, Fardo $fardo): JsonResponse
    {
        $data = $request->validated();

        $fardo->update($data);

        return response()->json(['data' => $fardo->refresh(), 'message' => 'Fardo actualizado.']);
    }

    public function destroy(Fardo $fardo): JsonResponse
    {
        if ($fardo->ventas()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar el fardo porque tiene ventas registradas.',
            ], 422);
        }

        $fardo->delete();

        return response()->json(['message' => 'Fardo eliminado.']);
    }

    protected function generarCodigo(): string
    {
        $ultimo = Fardo::latest('id')->value('codigo');
        $numero = $ultimo ? ((int) substr($ultimo, -4)) + 1 : 1;

        return 'FAR-' . str_pad((string) $numero, 4, '0', STR_PAD_LEFT);
    }
}