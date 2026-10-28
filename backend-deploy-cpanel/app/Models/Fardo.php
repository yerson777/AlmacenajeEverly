<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fardo extends Model
{
    public const CODIGO_LIQUIDACION = 'LIQUIDACIÓN';

    public const CATEGORIA_LIQUIDACION = 'Prendas de liquidación';

    protected $fillable = [
        'codigo',
        'categoria',
        'descripcion',
        'fecha_compra',
        'capital_invertido',
        'cantidad_prendas',
        'estado',
        'observaciones',
    ];

    protected $casts = [
        'fecha_compra' => 'date',
        'capital_invertido' => 'float',
        'cantidad_prendas' => 'integer',
    ];

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class);
    }

    public function ventasActivas()
    {
        return $this->ventas()->where('estado', '!=', Venta::ESTADO_ANULADA);
    }

    public function esLiquidacion(): bool
    {
        return mb_strtoupper((string) $this->codigo) === self::CODIGO_LIQUIDACION;
    }

    /**
     * Fardo fijo de liquidación: existe siempre para poder registrar
     * ventas sueltas sin capital invertido. Todo lo vendido es ganancia.
     */
    public static function liquidacion(): self
    {
        return self::firstOrCreate(
            ['codigo' => self::CODIGO_LIQUIDACION],
            [
                'categoria' => self::CATEGORIA_LIQUIDACION,
                'descripcion' => 'Ventas de prendas sueltas y liquidaciones. No consume capital invertido.',
                'fecha_compra' => null,
                'capital_invertido' => 0,
                'cantidad_prendas' => null,
                'estado' => 'En venta',
            ]
        );
    }

    /**
     * Lógica de capital: primero se recupera la inversión y solo
     * el excedente se considera ganancia. Nunca ganancia negativa.
     */
    public function calcular(): array
    {
        $ventas = (float) $this->ventasActivas()->sum('monto');

        if ($this->esLiquidacion()) {
            return [
                'ventas' => $ventas,
                'capital_recuperado' => 0.0,
                'capital_pendiente' => 0.0,
                'ganancia' => $ventas,
                'pct' => 0.0,
                'estado_recuperacion' => 'Solo ganancia',
            ];
        }

        $capital = (float) $this->capital_invertido;

        $capitalRecuperado = min($ventas, $capital);
        $capitalPendiente = max(0.0, $capital - $ventas);
        $ganancia = max(0.0, $ventas - $capital);
        $pct = $capital > 0 ? round($capitalRecuperado / $capital * 100, 2) : 0.0;

        if ($capital > 0 && $ventas >= $capital) {
            $estadoRecuperacion = 'Capital recuperado';
        } elseif ($ventas > 0) {
            $estadoRecuperacion = 'En proceso';
        } else {
            $estadoRecuperacion = 'Sin ventas';
        }

        return [
            'ventas' => $ventas,
            'capital_recuperado' => $capitalRecuperado,
            'capital_pendiente' => $capitalPendiente,
            'ganancia' => $ganancia,
            'pct' => $pct,
            'estado_recuperacion' => $estadoRecuperacion,
        ];
    }
}