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
        Schema::create('movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bolsa_id')->constrained('bolsas')->cascadeOnDelete();
            $table->string('tipo');
            $table->foreignId('casillero_origen_id')->nullable()->constrained('casilleros')->nullOnDelete();
            $table->unsignedSmallInteger('posicion_origen')->nullable();
            $table->foreignId('casillero_destino_id')->nullable()->constrained('casilleros')->nullOnDelete();
            $table->unsignedSmallInteger('posicion_destino')->nullable();
            $table->dateTime('fecha');
            $table->string('observaciones')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos');
    }
};