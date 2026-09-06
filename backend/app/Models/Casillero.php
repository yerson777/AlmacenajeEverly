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

    public function getEspaciosDisponiblesAttribute(): int
    {
        return max(0, $this->capacidad - $this->bolsas_activas);
    }

    public function getEstadoAttribute(): string
    {
        $activas = $this->bolsas_activas;

        if ($activas >= $this->capacidad) {
            return 'Lleno';
        }

        if ($activas >= (int) ceil($this->capacidad * 0.8)) {
            return 'Casi lleno';
        }

        return 'Disponible';
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }
}