<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Casillero extends Model
{
    protected $fillable = [
        'codigo',
        'descripcion',
        'capacidad',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function bolsas(): HasMany
    {
        return $this->hasMany(Bolsa::class);
    }

    public function getBolsasActivasAttribute(): int
    {
        return $this->bolsas()->whereNotNull('posicion')->count();
    }
}