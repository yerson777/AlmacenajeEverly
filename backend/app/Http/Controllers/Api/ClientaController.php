<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClientaRequest;
use App\Models\Clienta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Clienta::query();

        if ($request->has('q') && $request->input('q') !== '') {
            $q = trim((string) $request->input('q'));
            $query->where('nombre', 'like', "%{$q}%")
                ->orWhere('telefono', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%");
        }

        $clientas = $query->withCount('pedidos')->orderBy('nombre')->paginate(50);

        return response()->json($clientas);
    }

    public function store(ClientaRequest $request): JsonResponse
    {
        $data = $request->validated();

        $clienta = Clienta::create($data);

        return response()->json(['data' => $clienta->fresh(), 'message' => 'Clienta registrada.'], 201);
    }

    public function show(Clienta $clienta): JsonResponse
    {
        $clienta->load(['pedidos' => fn ($q) => $q->latest(), 'bolsas' => fn ($q) => $q->with('casillero')->latest()]);

        return response()->json(['data' => $clienta]);
    }

    public function update(ClientaRequest $request, Clienta $clienta): JsonResponse
    {
        $data = $request->validated();

        $clienta->update($data);

        return response()->json(['data' => $clienta->fresh(), 'message' => 'Clienta actualizada.']);
    }

    public function destroy(Clienta $clienta): JsonResponse
    {
        if ($clienta->pedidos()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar la clienta porque tiene pedidos registrados.',
            ], 422);
        }

        if ($clienta->bolsas()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar la clienta porque tiene bolsas registradas.',
            ], 422);
        }

        $clienta->delete();

        return response()->json(['message' => 'Clienta eliminada.']);
    }
}