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

    public function scopeBuscar($query, string $q = null)
    {
        if ($q) {
            $query->where('nombre', 'like', "%{$q}%")
                ->orWhere('telefono', 'like', "%{$q}%");
        }

        return $query;
    }
}