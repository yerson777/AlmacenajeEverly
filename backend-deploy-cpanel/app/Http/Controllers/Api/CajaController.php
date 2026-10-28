<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fardo;
use App\Models\Venta;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CajaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $hoy = CarbonImmutable::today();
        $liquidacion = Fardo::liquidacion();

        $filtro = (string) $request->input('filtro', 'hoy');
        $desdeInput = $request->input('desde');
        $hastaInput = $request->input('hasta');

        [$desde, $hasta] = $this->rangoParaFiltro($filtro, $desdeInput, $hastaInput, $hoy);

        $desdeStr = $desde->toDateString();
        $hastaStr = $hasta->toDateString();

        $ventasPeriodo = Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
            ->whereBetween('fecha', [$desdeStr, $hastaStr])
            ->get(['monto', 'forma_pago', 'pedido_id']);

        $formaPago = [];
        foreach (Venta::FORMAS_PAGO as $fp) {
            $formaPago[$fp] = ['total' => 0.0, 'cantidad' => 0];
        }
        foreach ($ventasPeriodo as $v) {
            $fp = (string) $v->forma_pago;
            if (! isset($formaPago[$fp])) {
                $formaPago[$fp] = ['total' => 0.0, 'cantidad' => 0];
            }
            $formaPago[$fp]['total'] += (float) $v->monto;
            $formaPago[$fp]['cantidad']++;
        }
        foreach ($formaPago as &$f) {
            $f['total'] = round($f['total'], 2);
        }

        $resumen = [
            'ventas' => round((float) $ventasPeriodo->sum('monto'), 2),
            'ventas_count' => $ventasPeriodo->count(),
            'pedidos_count' => $ventasPeriodo->whereNotNull('pedido_id')->pluck('pedido_id')->unique()->count(),
            'forma_pago' => $formaPago,
        ];

        $fardos = Fardo::orderBy('codigo')->get()->map(function (Fardo $f) {
            $c = $f->calcular();

            return [
                'id' => $f->id,
                'codigo' => $f->codigo,
                'categoria' => $f->categoria,
                'descripcion' => $f->descripcion,
                'fecha_compra' => $f->fecha_compra?->format('Y-m-d'),
                'capital_invertido' => round((float) $f->capital_invertido, 2),
                'cantidad_prendas' => $f->cantidad_prendas,
                'estado' => $f->estado,
                'observaciones' => $f->observaciones,
                'ventas_acumuladas' => round($c['ventas'], 2),
                'capital_recuperado' => round($c['capital_recuperado'], 2),
                'capital_pendiente' => round($c['capital_pendiente'], 2),
                'ganancia' => round($c['ganancia'], 2),
                'porcentaje_recuperacion' => $c['pct'],
                'estado_recuperacion' => $c['estado_recuperacion'],
                'es_liquidacion' => $f->esLiquidacion(),
            ];
        })->values();

        $fardosReales = $fardos->filter(fn ($f) => ! $f['es_liquidacion']);

        $capitalInvertidoTotal = $fardosReales->sum('capital_invertido');
        $capitalRecuperadoTotal = $fardosReales->sum('capital_recuperado');
        $capitalPendienteTotal = max(0.0, $capitalInvertidoTotal - $capitalRecuperadoTotal);
        $gananciaTotal = $fardos->sum('ganancia');
        $ventasTotales = $fardos->sum('ventas_acumuladas');
        $fardosRecuperados = $fardosReales->filter(fn ($f) => $f['porcentaje_recuperacion'] >= 100 && $f['capital_invertido'] > 0)->count();

        $global = [
            'capital_invertido' => round($capitalInvertidoTotal, 2),
            'capital_recuperado' => round($capitalRecuperadoTotal, 2),
            'capital_pendiente' => round($capitalPendienteTotal, 2),
            'ganancia' => round($gananciaTotal, 2),
            'ventas' => round($ventasTotales, 2),
            'porcentaje_recuperacion' => $capitalInvertidoTotal > 0 ? round($capitalRecuperadoTotal / $capitalInvertidoTotal * 100, 2) : 0.0,
            'fardos' => $fardosReales->count(),
            'fardos_recuperados' => $fardosRecuperados,
        ];

        $historial = Venta::with(['fardo:id,codigo,categoria', 'clienta:id,nombre', 'pedido:id,codigo'])
            ->where('estado', '!=', Venta::ESTADO_ANULADA)
            ->whereBetween('fecha', [$desdeStr, $hastaStr])
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(function (Venta $v) {
                return [
                    'id' => $v->id,
                    'fecha' => $v->fecha?->format('Y-m-d'),
                    'codigo_pedido' => $v->pedido?->codigo,
                    'clienta_nombre' => $v->clienta?->nombre,
                    'fardo_codigo' => $v->fardo?->codigo,
                    'fardo_categoria' => $v->fardo?->categoria,
                    'fardo_es_liquidacion' => (bool) $v->fardo?->esLiquidacion(),
                    'monto' => round((float) $v->monto, 2),
                    'forma_pago' => $v->forma_pago,
                    'estado' => $v->estado,
                ];
            });

        return response()->json([
            'data' => [
                'filtro' => $filtro,
                'desde' => $desdeStr,
                'hasta' => $hastaStr,
                'ventas_hoy' => $this->sumarVentasRango($hoy, $hoy),
                'ventas_semana' => $this->sumarVentasRango($hoy->startOfWeek(), $hoy->endOfWeek()),
                'ventas_mes' => $this->sumarVentasRango($hoy->startOfMonth(), $hoy->endOfMonth()),
                'global' => $global,
                'resumen' => $resumen,
                'fardos' => $fardos,
                'liquidacion' => $this->resumenLiquidacion($liquidacion, $hoy),
                'ventas' => $historial,
                'series' => [
                    'diario' => $this->porDias($hoy, 30),
                    'semanal' => $this->porSemanas($hoy, 12),
                    'mensual' => $this->porMeses($hoy, 12),
                ],
            ],
        ]);
    }

    /**
     * @return array<string, array{total: float, cantidad: int}>
     */
    private function resumenLiquidacion(Fardo $liquidacion, CarbonImmutable $hoy): array
    {
        $periodos = [
            'hoy' => [$hoy, $hoy],
            'semana' => [$hoy->startOfWeek(), $hoy->endOfWeek()],
            'mes' => [$hoy->startOfMonth(), $hoy->endOfMonth()],
        ];

        $resultado = [];

        foreach ($periodos as $clave => [$desde, $hasta]) {
            $resultado[$clave] = $this->ventasDeFardo($liquidacion->id, $desde, $hasta);
        }

        $resultado['total'] = $this->ventasDeFardo($liquidacion->id);

        return $resultado;
    }

    /**
     * @return array{total: float, cantidad: int}
     */
    private function ventasDeFardo(int $fardoId, ?CarbonImmutable $desde = null, ?CarbonImmutable $hasta = null): array
    {
        $query = Venta::where('fardo_id', $fardoId)
            ->where('estado', '!=', Venta::ESTADO_ANULADA);

        if ($desde && $hasta) {
            $query->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()]);
        }

        return [
            'total' => round((float) (clone $query)->sum('monto'), 2),
            'cantidad' => (clone $query)->count(),
        ];
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function rangoParaFiltro(string $filtro, ?string $desdeInput, ?string $hastaInput, CarbonImmutable $hoy): array
    {
        switch ($filtro) {
            case 'semana':
                return [$hoy->startOfWeek(), $hoy->endOfWeek()];
            case 'mes':
                return [$hoy->startOfMonth(), $hoy->endOfMonth()];
            case 'rango':
                $desde = $desdeInput ? CarbonImmutable::parse($desdeInput) : $hoy->subDays(29);
                $hasta = $hastaInput ? CarbonImmutable::parse($hastaInput) : $hoy;

                return [$desde->startOfDay(), $hasta->endOfDay()];
            default:
                return [$hoy, $hoy->endOfDay()];
        }
    }

    private function sumarVentasRango(CarbonImmutable $desde, CarbonImmutable $hasta): float
    {
        return round((float) Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
            ->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()])
            ->sum('monto'), 2);
    }

    private function porDias(CarbonImmutable $hoy, int $dias): array
    {
        $result = [];

        for ($i = $dias - 1; $i >= 0; $i--) {
            $dia = $hoy->subDays($i);
            $fecha = $dia->toDateString();
            $suma = Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
                ->where('fecha', $fecha)
                ->get(['monto']);

            $result[] = [
                'etiqueta' => $dia->format('d/m'),
                'fecha' => $fecha,
                'ventas' => round((float) $suma->sum('monto'), 2),
                'cantidad' => $suma->count(),
            ];
        }

        return $result;
    }

    private function porSemanas(CarbonImmutable $hoy, int $semanas): array
    {
        $result = [];

        for ($i = $semanas - 1; $i >= 0; $i--) {
            $inicio = $hoy->subWeeks($i)->startOfWeek();
            $fin = $inicio->addDays(6);
            $result[] = [
                'etiqueta' => $inicio->format('d/m') . ' – ' . $fin->format('d/m'),
                'fecha' => $inicio->toDateString(),
                'ventas' => $this->sumarVentasRango($inicio, $fin),
                'cantidad' => (int) Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
                    ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()])
                    ->count(),
            ];
        }

        return $result;
    }

    private function porMeses(CarbonImmutable $hoy, int $meses): array
    {
        $result = [];

        for ($i = $meses - 1; $i >= 0; $i--) {
            $mes = $hoy->subMonths($i);
            $inicio = $mes->startOfMonth();
            $fin = $mes->endOfMonth();
            $result[] = [
                'etiqueta' => $mes->locale('es')->translatedFormat('M Y'),
                'fecha' => $inicio->toDateString(),
                'ventas' => $this->sumarVentasRango($inicio, $fin),
                'cantidad' => (int) Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
                    ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()])
                    ->count(),
            ];
        }

        return $result;
    }
}