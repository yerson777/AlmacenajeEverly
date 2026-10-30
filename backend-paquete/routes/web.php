<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/api/caja/liquidacion-historial', [App\Http\Controllers\Api\CajaController::class, 'liquidacionHistorial']);
Route::get('/caja/liquidacion-historial', [App\Http\Controllers\Api\CajaController::class, 'liquidacionHistorial']);
