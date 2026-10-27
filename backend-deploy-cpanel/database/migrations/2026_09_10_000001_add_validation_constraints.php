<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ---- Índices para búsquedas y consistencia ----
        Schema::table('clientas', function (Blueprint $table) {
            $table->index('telefono', 'clientas_telefono_index');
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->index('clienta_id', 'pedidos_clienta_id_index');
            $table->index('fecha', 'pedidos_fecha_index');
        });

        Schema::table('bolsas', function (Blueprint $table) {
            $table->index('clienta_id', 'bolsas_clienta_id_index');
            $table->index('fecha_almacenamiento', 'bolsas_fecha_almacenamiento_index');
        });

        Schema::table('fardos', function (Blueprint $table) {
            $table->index('categoria', 'fardos_categoria_index');
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->index('fardo_id', 'ventas_fardo_id_index');
            $table->index('clienta_id', 'ventas_clienta_id_index');
            $table->index('pedido_id', 'ventas_pedido_id_index');
            $table->index('fecha', 'ventas_fecha_index');
        });

        Schema::table('movimientos', function (Blueprint $table) {
            $table->index('bolsa_id', 'movimientos_bolsa_id_index');
            $table->index('tipo', 'movimientos_tipo_index');
        });

        // ---- Restricciones CHECK (integridad a nivel de base de datos) ----
        $checks = [
            'alter table fardos add constraint fardos_capital_positivo check (capital_invertido >= 0)',
            'alter table ventas add constraint ventas_monto_positivo check (monto > 0)',
            'alter table casilleros add constraint casilleros_capacidad_minima check (capacidad >= 1)',
            'alter table bolsas add constraint bolsas_posicion_valida check (posicion is null or posicion >= 1)',
        ];

        foreach ($checks as $sql) {
            try {
                DB::statement($sql);
            } catch (\Throwable $e) {
                // Si la restricción ya existe o el motor no la soporta, seguimos.
            }
        }
    }

    public function down(): void
    {
        $checks = [
            'fardos_capital_positivo',
            'ventas_monto_positivo',
            'casilleros_capacidad_minima',
            'bolsas_posicion_valida',
        ];

        foreach ($checks as $constraint) {
            try {
                DB::statement("alter table " . strtok($constraint, '_') . " drop constraint {$constraint}");
            } catch (\Throwable $e) {
                // La restricción quizá no existía.
            }
        }

        Schema::table('movimientos', function (Blueprint $table) {
            $table->dropIndex('movimientos_tipo_index');
            $table->dropIndex('movimientos_bolsa_id_index');
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->dropIndex('ventas_fecha_index');
            $table->dropIndex('ventas_pedido_id_index');
            $table->dropIndex('ventas_clienta_id_index');
            $table->dropIndex('ventas_fardo_id_index');
        });

        Schema::table('fardos', function (Blueprint $table) {
            $table->dropIndex('fardos_categoria_index');
        });

        Schema::table('bolsas', function (Blueprint $table) {
            $table->dropIndex('bolsas_fecha_almacenamiento_index');
            $table->dropIndex('bolsas_clienta_id_index');
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropIndex('pedidos_fecha_index');
            $table->dropIndex('pedidos_clienta_id_index');
        });

        Schema::table('clientas', function (Blueprint $table) {
            $table->dropIndex('clientas_telefono_index');
        });
    }
};