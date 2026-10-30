<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Movimiento extends Model
{
    public const TIPO_ALMACENADA = 'Almacenada';
    public const TIPO_ENTREGADA = 'Entregada';
    public const TIPO_MOVIDA = 'Movida';

    protected $fillable = [
        'bolsa_id',
        'tipo',
        'casillero_origen_id',
        'posicion_origen',
        'casillero_destino_id',
        'posicion_destino',
        'fecha',
        'observaciones',
    ];

    protected $casts = [
        'fecha' => 'datetime',
    ];

    public function bolsa(): BelongsTo
    {
        return $this->belongsTo(Bolsa::class);
    }

    public function casilleroOrigen(): BelongsTo
    {
        return $this->belongsTo(Casillero::class, 'casillero_origen_id');
    }

    public function casilleroDestino(): BelongsTo
    {
        return $this->belongsTo(Casillero::class, 'casillero_destino_id');
    }
}