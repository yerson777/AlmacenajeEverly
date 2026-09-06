<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Movimiento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovimientoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Movimiento::with(['bolsa:id,codigo', 'casilleroOrigen:id,codigo', 'casilleroDestino:id,codigo'])
            ->latest('fecha');

        if ($request->has('bolsa_id') && $request->input('bolsa_id')) {
            $query->where('bolsa_id', $request->input('bolsa_id'));
        }

        $movimientos = $query->limit(200)->get();

        return response()->json(['data' => $movimientos]);
    }
}