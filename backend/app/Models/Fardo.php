<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fardo extends Model
{
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

    /**
     * Lógica de capital: primero se recupera la inversión y solo
     * el excedente se considera ganancia. Nunca ganancia negativa.
     */
    public function calcular(): array
    {
        $ventas = (float) $this->ventasActivas()->sum('monto');
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