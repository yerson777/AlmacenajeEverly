<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clienta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Clienta::query();

        if ($request->has('q') && $request->input('q') !== '') {
            $q = $request->input('q');
            $query->where('nombre', 'like', "%{$q}%")
                ->orWhere('telefono', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%");
        }

        $clientas = $query->withCount('pedidos')->orderBy('nombre')->paginate(50);

        return response()->json($clientas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'notas' => 'nullable|string|max:500',
        ]);

        $clienta = Clienta::create($data);

        return response()->json(['data' => $clienta->fresh(), 'message' => 'Clienta registrada.'], 201);
    }

    public function show(Clienta $clienta): JsonResponse
    {
        $clienta->load(['pedidos' => fn ($q) => $q->latest(), 'bolsas' => fn ($q) => $q->with('casillero')->latest()]);

        return response()->json(['data' => $clienta]);
    }

    public function update(Request $request, Clienta $clienta): JsonResponse
    {
        $data = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'notas' => 'nullable|string|max:500',
        ]);

        $clienta->update($data);

        return response()->json(['data' => $clienta->fresh(), 'message' => 'Clienta actualizada.']);
    }

    public function destroy(Clienta $clienta): JsonResponse
    {
        $clienta->delete();

        return response()->json(['message' => 'Clienta eliminada.']);
    }
}