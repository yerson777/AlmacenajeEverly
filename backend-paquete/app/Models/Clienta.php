<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clienta extends Model
{
    protected $fillable = [
        'nombre',
        'telefono',
        'email',
        'direccion',
        'notas',
    ];

    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class);
    }

    public function bolsas(): HasMany
    {
        return $this->hasMany(Bolsa::class);
    }
}