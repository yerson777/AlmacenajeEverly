<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FardoRequest;
use App\Models\Fardo;
use App\Support\CodigoAutomatico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FardoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Fardo::liquidacion();

        $query = Fardo::query();

        if ($q = trim((string) $request->input('q', ''))) {
            $query->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhere('categoria', 'like', "%{$q}%")
                    ->orWhere('descripcion', 'like', "%{$q}%");
            });
        }

        $fardos = $query
            ->orderByRaw('CASE WHEN codigo = ? THEN 0 ELSE 1 END', [Fardo::CODIGO_LIQUIDACION])
            ->orderByDesc('id')
            ->get()
            ->map(function ($fardo) {
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
                    'es_liquidacion' => $fardo->esLiquidacion(),
                ];
            });

        return response()->json(['data' => $fardos]);
    }

    public function store(FardoRequest $request): JsonResponse
    {
        $data = $request->validated();
        $codigoManual = $data['codigo'] ?? null;
        unset($data['codigo']);

        $data['estado'] = $data['estado'] ?? 'En venta';

        $fardo = $codigoManual
            ? Fardo::create(['codigo' => $codigoManual] + $data)
            : CodigoAutomatico::crear(
                Fardo::class,
                'FAR',
                4,
                fn (string $codigo) => Fardo::create(['codigo' => $codigo] + $data)
            );

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
                'es_liquidacion' => $fardo->esLiquidacion(),
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
        if ($fardo->esLiquidacion()) {
            return response()->json([
                'message' => 'El fardo LIQUIDACIÓN es fijo y no se puede editar.',
            ], 422);
        }

        $data = $request->validated();

        $fardo->update($data);

        return response()->json(['data' => $fardo->refresh(), 'message' => 'Fardo actualizado.']);
    }

    public function destroy(Fardo $fardo): JsonResponse
    {
        if ($fardo->esLiquidacion()) {
            return response()->json([
                'message' => 'El fardo LIQUIDACIÓN es fijo y no se puede eliminar.',
            ], 422);
        }

        if ($fardo->ventas()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar el fardo porque tiene ventas registradas.',
            ], 422);
        }

        $fardo->delete();

        return response()->json(['message' => 'Fardo eliminado.']);
    }

}