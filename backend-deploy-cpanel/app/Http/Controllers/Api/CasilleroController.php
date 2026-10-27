<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CasilleroRequest;
use App\Models\Bolsa;
use App\Models\Casillero;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CasilleroController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Casillero::withCount([
            'bolsas as bolsas_activas' => fn ($q) => $q->whereNotNull('posicion'),
        ])->orderBy('codigo');

        if ($request->has('activos') && $request->boolean('activos')) {
            $query->where('activo', true);
        }

        $casilleros = $query->get()->map(function (Casillero $casillero) {
            return $this->serialize($casillero);
        });

        return response()->json(['data' => $casilleros]);
    }

    public function store(CasilleroRequest $request): JsonResponse
    {
        $data = $request->validated();

        $casillero = Casillero::create($data);

        return response()->json(['data' => $this->serialize($casillero), 'message' => 'Casillero creado.'], 201);
    }

    public function show(Casillero $casillero): JsonResponse
    {
        $casillero->loadCount([
            'bolsas as bolsas_activas' => fn ($q) => $q->whereNotNull('posicion'),
        ]);

        return response()->json(['data' => $this->serialize($casillero)]);
    }

    public function update(CasilleroRequest $request, Casillero $casillero): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['capacidad']) && $data['capacidad'] < $casillero->bolsas_activas) {
            return response()->json([
                'message' => "No se puede reducir la capacidad: el casillero tiene {$casillero->bolsas_activas} bolsas almacenadas.",
            ], 422);
        }

        $casillero->update($data);

        return response()->json(['data' => $this->serialize($casillero->refresh()), 'message' => 'Casillero actualizado.']);
    }

    public function destroy(Casillero $casillero): JsonResponse
    {
        $activas = $casillero->bolsas()->whereNotNull('posicion')->count();

        if ($activas > 0) {
            return response()->json(['message' => 'No se puede eliminar un casillero con bolsas almacenadas.'], 422);
        }

        $casillero->delete();

        return response()->json(['message' => 'Casillero eliminado.'], 200);
    }

    public function setEstado(Request $request, Casillero $casillero): JsonResponse
    {
        $data = $request->validate([
            'activo' => 'required|boolean',
        ]);

        if (! $data['activo'] && $casillero->bolsas_activas > 0) {
            return response()->json(['message' => 'No se puede desactivar un casillero con bolsas almacenadas.'], 422);
        }

        $casillero->update(['activo' => $data['activo']]);

        return response()->json([
            'data' => $this->serialize($casillero->refresh()),
            'message' => $data['activo'] ? 'Casillero activado.' : 'Casillero desactivado.',
        ]);
    }

    public function posiciones(Casillero $casillero): JsonResponse
    {
        $ocupadas = Bolsa::where('casillero_id', $casillero->id)
            ->where('estado', Bolsa::ESTADO_PENDIENTE)
            ->whereNotNull('posicion')
            ->get(['id', 'codigo', 'posicion', 'clienta_id'])
            ->keyBy('posicion');

        $posiciones = [];
        for ($i = 1; $i <= $casillero->capacidad; $i++) {
            $posiciones[] = [
                'posicion' => $i,
                'ocupada' => $ocupadas->has($i),
                'bolsa' => $ocupadas->get($i),
            ];
        }

        return response()->json(['data' => $posiciones]);
    }

    protected function serialize(Casillero $casillero): array
    {
        $activas = $casillero->bolsas_activas;

        return [
            'id' => $casillero->id,
            'codigo' => $casillero->codigo,
            'descripcion' => $casillero->descripcion,
            'capacidad' => $casillero->capacidad,
            'activo' => $casillero->activo,
            'bolsas_activas' => $activas,
            'espacios_disponibles' => max(0, $casillero->capacidad - $activas),
            'estado' => $this->computeEstado($casillero, $activas),
        ];
    }

    protected function computeEstado(Casillero $casillero, int $activas): string
    {
        if ($activas >= $casillero->capacidad) {
            return 'Lleno';
        }

        if ($activas >= (int) ceil($casillero->capacidad * 0.8)) {
            return 'Casi lleno';
        }

        return 'Disponible';
    }
}