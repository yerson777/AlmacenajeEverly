<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fardo;
use App\Models\Venta;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class CajaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tz = config('app.timezone', 'America/La_Paz');
        $hoy = CarbonImmutable::now($tz)->startOfDay();
        $liquidacion = Fardo::liquidacion();

        $filtro = (string) $request->input('filtro', 'hoy');
        $desdeInput = $request->input('desde');
        $hastaInput = $request->input('hasta');
        $offset = (int) $request->input('offset', 0);
        $liqPeriodo = (string) $request->input('liq_periodo', 'total');
        $liqOffset = (int) $request->input('liq_offset', 0);

        [$desde, $hasta] = $this->rangoParaFiltro($filtro, $desdeInput, $hastaInput, $hoy, $offset, $tz);

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

        $perPageVentas = (int) $request->input('ventas_per_page', 10);
        if ($perPageVentas < 1 || $perPageVentas > 100) {
            $perPageVentas = 10;
        }

        $totalVentas = (int) $resumen['ventas_count'];
        $maxPaginasVentas = max(1, (int) ceil($totalVentas / $perPageVentas));
        $paginaVentas = min(max(1, (int) $request->input('ventas_page', 1)), $maxPaginasVentas);

        $ventasPaginadas = Venta::with(['fardo:id,codigo,categoria', 'clienta:id,nombre', 'pedido:id,codigo'])
            ->where('estado', '!=', Venta::ESTADO_ANULADA)
            ->whereBetween('fecha', [$desdeStr, $hastaStr])
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->paginate($perPageVentas, ['*'], 'ventas_page', $paginaVentas);

        $historial = $ventasPaginadas->getCollection()->map(function (Venta $v) {
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
        })->values();

        $liquidacionRes = $this->resumenLiquidacion($liquidacion, $hoy, $liqPeriodo, $liqOffset, $tz);

        return response()->json([
            'data' => [
                'filtro' => $filtro,
                'desde' => $desdeStr,
                'hasta' => $hastaStr,
                'ventas_hoy' => $this->sumarVentasRango($hoy, $hoy),
                'ventas_semana' => $this->sumarVentasRango($hoy->startOfWeek(Carbon::MONDAY), $hoy->endOfWeek(Carbon::SUNDAY)),
                'ventas_mes' => $this->sumarVentasRango($hoy->startOfMonth(), $hoy->endOfMonth()),
                'global' => $global,
                'resumen' => $resumen,
                'fardos' => $fardos,
                'liquidacion' => $liquidacionRes,
                'ventas' => $historial,
                'ventas_paginacion' => [
                    'total' => $ventasPaginadas->total(),
                    'current_page' => $ventasPaginadas->currentPage(),
                    'last_page' => $ventasPaginadas->lastPage(),
                    'per_page' => $ventasPaginadas->perPage(),
                ],
                'series' => [
                    'diario' => $this->porDias($hoy, 30),
                    'semanal' => $this->porSemanas($hoy, 12),
                    'mensual' => $this->porMeses($hoy, 12),
                ],
            ],
        ]);
    }

    public function liquidacionHistorial(Request $request): JsonResponse
    {
        $tz = config('app.timezone', 'America/La_Paz');
        $hoy = CarbonImmutable::now($tz)->startOfDay();
        $liquidacion = Fardo::liquidacion();
        if (! $liquidacion) {
            return response()->json(['data' => ['grupo' => 'semanal', 'items' => [], 'grafico_mensual' => []]]);
        }

        $grupo = (string) $request->input('grupo', 'semanal');
        $limite = (int) $request->input('limite', 0);
        if ($grupo === 'mensual') {
            $items = [];
            $maxMeses = $limite > 0 ? min($limite, 60) : 24;
            for ($i = $maxMeses - 1; $i >= 0; $i--) {
                $mes = $hoy->subMonths($i)->startOfMonth();
                $desde = $mes;
                $hasta = $mes->endOfMonth();
                $v = $this->ventasDeFardo($liquidacion->id, $desde, $hasta);
                $items[] = [
                    'periodo' => $mes->locale('es')->translatedFormat('F Y'),
                    'clave' => $mes->format('Y-m'),
                    'inicio' => $desde->toDateString(),
                    'fin' => $hasta->toDateString(),
                    'cantidad' => $v['cantidad'],
                    'ganancia' => $v['total'],
                    'promedio' => $v['cantidad'] > 0 ? round($v['total'] / $v['cantidad'], 2) : 0.0,
                    'num_liquidaciones' => $v['cantidad'],
                ];
            }
            // Ordenar del más reciente al más antiguo
            $items = array_reverse($items);
            $this->agregarVariacion($items);
            $graficoBase = array_reverse($items);
            $grafico = array_map(function ($it) {
                $etq = (string) $it['periodo'];
                $etq = str_replace(['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'], ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'], $etq);
                return ['etiqueta' => \Illuminate\Support\Str::limit($etq, 8, ''), 'ganancia' => $it['ganancia'], 'cantidad' => $it['cantidad'], 'periodo' => $it['periodo']];
            }, array_slice($graficoBase, 0, 6));
            return response()->json(['data' => ['grupo' => 'mensual', 'items' => $items, 'grafico_mensual' => $grafico, 'grafico' => $grafico]]);
        }

        $items = [];
        $maxSemanas = $limite > 0 ? min($limite, 104) : 52;
        for ($i = $maxSemanas - 1; $i >= 0; $i--) {
            $base = $hoy->subWeeks($i);
            $desde = $base->startOfWeek(Carbon::MONDAY);
            $hasta = $base->endOfWeek(Carbon::SUNDAY);
            $v = $this->ventasDeFardo($liquidacion->id, $desde, $hasta);
            $items[] = [
                'periodo' => $desde->format('d/m') . ' – ' . $hasta->format('d/m/Y'),
                'clave' => $desde->format('Y-W'),
                'inicio' => $desde->toDateString(),
                'fin' => $hasta->toDateString(),
                'cantidad' => $v['cantidad'],
                'ganancia' => $v['total'],
                'promedio' => $v['cantidad'] > 0 ? round($v['total'] / $v['cantidad'], 2) : 0.0,
                'num_liquidaciones' => $v['cantidad'],
            ];
        }
        $items = array_reverse($items);
        $this->agregarVariacion($items);
        $graficoBase = array_reverse($items);
        $grafico = array_map(fn ($it) => ['etiqueta' => $it['inicio'], 'ganancia' => $it['ganancia'], 'cantidad' => $it['cantidad'], 'periodo' => $it['periodo']], array_slice($graficoBase, 0, 6));
        return response()->json(['data' => ['grupo' => 'semanal', 'items' => $items, 'grafico_mensual' => $grafico, 'grafico' => $grafico]]);
    }

    /**
     * @param array<int, array<string,mixed>> $items
     */
    private function agregarVariacion(array &$items): void
    {
        $count = count($items);
        for ($i = 0; $i < $count; $i++) {
            // items are ordered from most recent to oldest after reverse
            if ($i === 0) {
                $items[$i]['variacion'] = null;
                $items[$i]['mejor'] = false;
                continue;
            }
            // compare with previous in list which is older? no - we reversed so index 0 is newest, index 1 is older
            // variation vs previous period (older) - previous in array is older, so variacion vs periodo anterior means (cur / prev_old - 1)*100? 
            // spec says "variación % vs. el periodo anterior" - anterior = older? or just previous in sequence; keep consistent with most recent first, compare to next (older)
            $anterior = $items[$i]['ganancia']; // will overwrite; compute properly
        }
        // better: compute with correct order
        for ($i = 0; $i < $count; $i++) {
            if ($i === $count - 1) {
                $items[$i]['variacion'] = null;
                $items[$i]['mejor'] = false;
                continue;
            }
            $prev = $items[$i + 1]['ganancia']; // older period
            $cur = $items[$i]['ganancia']; // newer period
            if ($prev == 0) {
                $items[$i]['variacion'] = $cur == 0 ? 0.0 : 100.0;
            } else {
                $items[$i]['variacion'] = round((($cur - $prev) / $prev) * 100, 2);
            }
            $items[$i]['mejor'] = false;
        }
        // oldest might already have null set above if count==1; ensure
        if ($count === 1) {
            $items[0]['variacion'] = null;
            $items[0]['mejor'] = true;
            return;
        }
        if ($count > 0) {
            $mejorIdx = 0;
            $max = $items[0]['ganancia'];
            for ($i = 1; $i < $count; $i++) {
                if ($items[$i]['ganancia'] > $max) {
                    $max = $items[$i]['ganancia'];
                    $mejorIdx = $i;
                }
            }
            $items[$mejorIdx]['mejor'] = true;
        }
        // ensure oldest has null
        $items[$count - 1]['variacion'] = null;
    }

    /**
     * @return array<string, array{total: float, cantidad: int}|mixed>
     */
    private function resumenLiquidacion(Fardo $liquidacion, CarbonImmutable $hoy, string $liqPeriodo = 'total', int $liqOffset = 0, string $tz = 'America/La_Paz'): array
    {
        $periodos = [
            'hoy' => [$hoy, $hoy],
            'semana' => [$hoy->startOfWeek(Carbon::MONDAY), $hoy->endOfWeek(Carbon::SUNDAY)],
            'mes' => [$hoy->startOfMonth(), $hoy->endOfMonth()],
        ];

        $resultado = [];

        foreach ($periodos as $clave => [$desde, $hasta]) {
            if ($clave === 'hoy') {
                $base = $hoy->subDays($liqOffset);
                $resultado[$clave] = $this->ventasDeFardo($liquidacion->id, $base, $base);
                continue;
            }
            if ($clave === 'semana') {
                $base = $hoy->subWeeks($liqOffset);
                $resultado[$clave] = $this->ventasDeFardo($liquidacion->id, $base->startOfWeek(Carbon::MONDAY), $base->endOfWeek(Carbon::SUNDAY));
                continue;
            }
            if ($clave === 'mes') {
                $base = $hoy->subMonths($liqOffset)->startOfMonth();
                $resultado[$clave] = $this->ventasDeFardo($liquidacion->id, $base, $base->endOfMonth());
                continue;
            }
            $resultado[$clave] = $this->ventasDeFardo($liquidacion->id, $desde, $hasta);
        }

        $resultado['total'] = $this->ventasDeFardo($liquidacion->id);

        // Añadir labels/rangos para periodo actual solicitado
        if ($liqPeriodo === 'hoy') {
            $d = $hoy->subDays($liqOffset);
            $resultado['actual'] = [
                'clave' => 'hoy',
                'label' => $d->format('d/m/Y'),
                'desde' => $d->toDateString(),
                'hasta' => $d->toDateString(),
            ];
            $resultado['rango_actual'] = $resultado['hoy'];
        } elseif ($liqPeriodo === 'semana') {
            $d = $hoy->subWeeks($liqOffset);
            $inicio = $d->startOfWeek(Carbon::MONDAY);
            $fin = $d->endOfWeek(Carbon::SUNDAY);
            $resultado['actual'] = [
                'clave' => 'semana',
                'label' => $inicio->format('d/m') . ' – ' . $fin->format('d/m/Y'),
                'desde' => $inicio->toDateString(),
                'hasta' => $fin->toDateString(),
            ];
            $resultado['rango_actual'] = $resultado['semana'];
        } elseif ($liqPeriodo === 'mes') {
            $d = $hoy->subMonths($liqOffset)->startOfMonth();
            $fin = $d->endOfMonth();
            $resultado['actual'] = [
                'clave' => 'mes',
                'label' => $d->locale('es')->translatedFormat('F Y'),
                'desde' => $d->toDateString(),
                'hasta' => $fin->toDateString(),
            ];
            $resultado['rango_actual'] = $resultado['mes'];
        } else {
            $resultado['actual'] = [
                'clave' => 'total',
                'label' => 'Total histórico',
            ];
            $resultado['rango_actual'] = $resultado['total'];
        }

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
    private function rangoParaFiltro(string $filtro, ?string $desdeInput, ?string $hastaInput, CarbonImmutable $hoy, int $offset = 0, string $tz = 'America/La_Paz'): array
    {
        switch ($filtro) {
            case 'semana':
                $base = $hoy->subWeeks($offset);
                return [$base->startOfWeek(Carbon::MONDAY), $base->endOfWeek(Carbon::SUNDAY)];
            case 'mes':
                $base = $hoy->subMonths($offset)->startOfMonth();
                return [$base, $base->endOfMonth()];
            case 'rango':
                $desde = $desdeInput ? CarbonImmutable::parse($desdeInput, $tz) : $hoy->subDays(29);
                $hasta = $hastaInput ? CarbonImmutable::parse($hastaInput, $tz) : $hoy;

                return [$desde->startOfDay(), $hasta->endOfDay()];
            default:
                $base = $hoy->subDays($offset);
                return [$base, $base];
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

    private function porDiasRango(CarbonImmutable $desde, CarbonImmutable $hasta): array
    {
        $result = [];
        $fin = $hasta < $desde ? $desde : $hasta;
        $inicio = $desde > $fin ? $fin : $desde;
        $cur = $inicio;
        while ($cur <= $fin) {
            $fecha = $cur->toDateString();
            $suma = Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
                ->where('fecha', $fecha)
                ->get(['monto']);
            $result[] = [
                'etiqueta' => $cur->format('d/m'),
                'fecha' => $fecha,
                'ventas' => round((float) $suma->sum('monto'), 2),
                'cantidad' => $suma->count(),
            ];
            $cur = $cur->addDay();
        }
        return $result;
    }

    private function porHoras(CarbonImmutable $dia): array
    {
        $result = [];
        $fecha = $dia->toDateString();
        for ($h = 0; $h < 24; $h++) {
            $sum = Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
                ->whereDate('fecha', $fecha)
                ->whereRaw('HOUR(created_at) = ?', [$h])
                ->sum('monto');
            $count = Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
                ->whereDate('fecha', $fecha)
                ->whereRaw('HOUR(created_at) = ?', [$h])
                ->count();
            $result[] = [
                'etiqueta' => str_pad((string)$h, 2, '0', STR_PAD_LEFT) . ':00',
                'fecha' => $fecha,
                'ventas' => round((float) $sum, 2),
                'cantidad' => (int) $count,
            ];
        }
        return $result;
    }

    private function porSemanas(CarbonImmutable $hoy, int $semanas): array
    {
        $result = [];

        for ($i = $semanas - 1; $i >= 0; $i--) {
            $inicio = $hoy->subWeeks($i)->startOfWeek(Carbon::MONDAY);
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

    private function porSemanasRango(CarbonImmutable $desde, CarbonImmutable $hasta): array
    {
        $result = [];
        $inicio = $desde->startOfWeek(Carbon::MONDAY);
        $fin = $hasta->endOfWeek(Carbon::SUNDAY);
        $cur = $inicio;
        while ($cur <= $fin) {
            $result[] = [
                'etiqueta' => $cur->format('d/m') . ' – ' . $cur->endOfWeek(Carbon::SUNDAY)->format('d/m'),
                'fecha' => $cur->toDateString(),
                'ventas' => $this->sumarVentasRango($cur, $cur->endOfWeek(Carbon::SUNDAY)),
                'cantidad' => (int) Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
                    ->whereBetween('fecha', [$cur->toDateString(), $cur->endOfWeek(Carbon::SUNDAY)->toDateString()])
                    ->count(),
            ];
            $cur = $cur->addWeek();
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

    private function porMesesRango(CarbonImmutable $desde, CarbonImmutable $hasta): array
    {
        $result = [];
        $cur = $desde->startOfMonth();
        $fin = $hasta->startOfMonth();
        while ($cur <= $fin) {
            $inicio = $cur;
            $result[] = [
                'etiqueta' => $cur->locale('es')->translatedFormat('M Y'),
                'fecha' => $inicio->toDateString(),
                'ventas' => $this->sumarVentasRango($inicio, $cur->endOfMonth()),
                'cantidad' => (int) Venta::where('estado', '!=', Venta::ESTADO_ANULADA)
                    ->whereBetween('fecha', [$inicio->toDateString(), $cur->endOfMonth()->toDateString()])
                    ->count(),
            ];
            $cur = $cur->addMonth();
        }
        return $result;
    }
}