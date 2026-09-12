<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fardos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('categoria');
            $table->string('descripcion')->nullable();
            $table->date('fecha_compra')->nullable();
            $table->decimal('capital_invertido', 10, 2);
            $table->unsignedInteger('cantidad_prendas')->nullable();
            $table->string('estado')->default('En venta');
            $table->string('observaciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fardos');
    }
};