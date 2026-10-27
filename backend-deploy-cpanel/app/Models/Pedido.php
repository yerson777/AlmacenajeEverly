<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $fillable = [
        'clienta_id',
        'codigo',
        'fecha',
        'total',
        'estado',
        'observaciones',
    ];

    public function clienta(): BelongsTo
    {
        return $this->belongsTo(Clienta::class);
    }

    public function bolsas(): HasMany
    {
        return $this->hasMany(Bolsa::class);
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class);
    }
}