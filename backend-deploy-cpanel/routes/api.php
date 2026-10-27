<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BolsaController;
use App\Http\Controllers\Api\CajaController;
use App\Http\Controllers\Api\CasilleroController;
use App\Http\Controllers\Api\ClientaController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FardoController;
use App\Http\Controllers\Api\MovimientoController;
use App\Http\Controllers\Api\PedidoController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\VentaController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/pendientes', [DashboardController::class, 'pendientes']);
    Route::get('/buscar', [DashboardController::class, 'buscar']);

    Route::apiResource('casilleros', CasilleroController::class)->except(['create', 'edit']);
    Route::patch('casilleros/{casillero}/estado', [CasilleroController::class, 'setEstado']);
    Route::get('casilleros/{casillero}/posiciones', [CasilleroController::class, 'posiciones']);

    Route::apiResource('clientas', ClientaController::class)->except(['create', 'edit']);
    Route::apiResource('pedidos', PedidoController::class)->except(['create', 'edit']);

    Route::apiResource('bolsas', BolsaController::class)->except(['create', 'edit']);
    Route::post('bolsas/{bolsa}/entregar', [BolsaController::class, 'entregar']);
    Route::post('bolsas/{bolsa}/mover', [BolsaController::class, 'mover']);

    Route::get('movimientos', [MovimientoController::class, 'index']);

    Route::apiResource('fardos', FardoController::class)->except(['create', 'edit']);
    Route::apiResource('ventas', VentaController::class)->except(['create', 'edit', 'show']);
    Route::patch('ventas/{venta}/anular', [VentaController::class, 'anular']);

    Route::get('caja', [CajaController::class, 'index']);

    Route::middleware('role:super_admin')->group(function () {
        Route::apiResource('usuarios', UsuarioController::class)->except(['create', 'edit', 'show']);
    });
});