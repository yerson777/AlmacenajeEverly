<?php

namespace Database\Seeders;

use App\Models\Bolsa;
use App\Models\Casillero;
use App\Models\Clienta;
use App\Models\Movimiento;
use App\Models\Pedido;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $codigos = ['A-1', 'A-2', 'A-3', 'A-4', 'B-1', 'B-2', 'B-3'];
        foreach ($codigos as $codigo) {
            Casillero::create(['codigo' => $codigo, 'capacidad' => 30, 'activo' => true]);
        }

        $maria = Clienta::create([
            'nombre' => 'María Pérez',
            'telefono' => '71234567',
            'email' => 'maria@example.com',
        ]);

        $carla = Clienta::create([
            'nombre' => 'Carla Gómez',
            'telefono' => '79876543',
        ]);

        $pedido1 = Pedido::create([
            'clienta_id' => $maria->id,
            'codigo' => 'VF-000001',
            'fecha' => now()->toDateString(),
            'total' => 150.00,
            'estado' => 'Pendiente',
        ]);

        $pedido2 = Pedido::create([
            'clienta_id' => $carla->id,
            'codigo' => 'VF-000002',
            'fecha' => now()->toDateString(),
            'total' => 80.50,
            'estado' => 'Pendiente',
        ]);

        $casilleroA1 = Casillero::where('codigo', 'A-1')->first();
        $casilleroB1 = Casillero::where('codigo', 'B-1')->first();

        $bolsa1 = Bolsa::create([
            'clienta_id' => $maria->id,
            'pedido_id' => $pedido1->id,
            'codigo' => 'VF-B-000001',
            'casillero_id' => $casilleroA1->id,
            'posicion' => 12,
            'fecha_almacenamiento' => now()->toDateString(),
            'estado' => Bolsa::ESTADO_PENDIENTE,
        ]);

        $bolsa2 = Bolsa::create([
            'clienta_id' => $carla->id,
            'pedido_id' => $pedido2->id,
            'codigo' => 'VF-B-000002',
            'casillero_id' => $casilleroB1->id,
            'posicion' => 5,
            'fecha_almacenamiento' => now()->toDateString(),
            'estado' => Bolsa::ESTADO_PENDIENTE,
        ]);

        Movimiento::create([
            'bolsa_id' => $bolsa1->id,
            'tipo' => Movimiento::TIPO_ALMACENADA,
            'casillero_destino_id' => $casilleroA1->id,
            'posicion_destino' => 12,
            'fecha' => now(),
        ]);

        Movimiento::create([
            'bolsa_id' => $bolsa2->id,
            'tipo' => Movimiento::TIPO_ALMACENADA,
            'casillero_destino_id' => $casilleroB1->id,
            'posicion_destino' => 5,
            'fecha' => now(),
        ]);
    }
}