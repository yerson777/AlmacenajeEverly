<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bolsas', function (Blueprint $table) {
            $table->longText('imagen')->nullable()->after('observaciones');
        });
    }

    public function down(): void
    {
        Schema::table('bolsas', function (Blueprint $table) {
            $table->dropColumn('imagen');
        });
    }
};