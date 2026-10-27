<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Venta extends Model
{
    public const ESTADO_PAGADA = 'Pagada';
    public const ESTADO_ANULADA = 'Anulada';

    public const FORMAS_PAGO = ['Efectivo', 'QR', 'Transferencia', 'Otro'];

    protected $fillable = [
        'fardo_id',
        'clienta_id',
        'pedido_id',
        'monto',
        'forma_pago',
        'fecha',
        'observaciones',
        'estado',
    ];

    protected $casts = [
        'monto' => 'float',
        'fecha' => 'date',
    ];

    public function fardo(): BelongsTo
    {
        return $this->belongsTo(Fardo::class);
    }

    public function clienta(): BelongsTo
    {
        return $this->belongsTo(Clienta::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }
}