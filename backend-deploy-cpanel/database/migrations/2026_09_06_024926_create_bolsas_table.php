<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bolsas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clienta_id')->constrained('clientas')->cascadeOnDelete();
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->string('codigo')->unique();
            $table->foreignId('casillero_id')->nullable()->constrained('casilleros')->nullOnDelete();
            $table->unsignedSmallInteger('posicion')->nullable();
            $table->date('fecha_almacenamiento')->nullable();
            $table->string('estado')->default('Pendiente de entrega');
            $table->string('observaciones')->nullable();
            $table->timestamps();

            $table->unique(['casillero_id', 'posicion'], 'bolsas_casillero_posicion_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bolsas');
    }
};