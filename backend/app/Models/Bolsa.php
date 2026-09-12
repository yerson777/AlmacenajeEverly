<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bolsa extends Model
{
    protected $fillable = [
        'clienta_id',
        'pedido_id',
        'codigo',
        'casillero_id',
        'posicion',
        'fecha_almacenamiento',
        'estado',
        'observaciones',
        'imagen',
    ];

    protected $dates = ['fecha_almacenamiento'];

    public const ESTADO_PENDIENTE = 'Pendiente de entrega';
    public const ESTADO_ENTREGADA = 'Entregada';

    public function clienta(): BelongsTo
    {
        return $this->belongsTo(Clienta::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function casillero(): BelongsTo
    {
        return $this->belongsTo(Casillero::class);
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(Movimiento::class);
    }
}