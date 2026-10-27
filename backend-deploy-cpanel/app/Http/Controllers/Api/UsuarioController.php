<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UsuarioRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsuarioController extends Controller
{
    public function index(): JsonResponse
    {
        $usuarios = User::orderBy('name')->get()->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'created_at' => $u->created_at?->toDateString(),
        ]);

        return response()->json(['data' => $usuarios]);
    }

    public function store(UsuarioRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => $data['password'],
        ]);

        return response()->json([
            'data' => $user->refresh(),
            'message' => 'Usuario creado y listo para dárselo al personal.',
        ], 201);
    }

    public function update(UsuarioRequest $request, User $usuario): JsonResponse
    {
        $data = $request->validated();

        $usuario->name = $data['name'] ?? $usuario->name;
        $usuario->email = $data['email'] ?? $usuario->email;
        $usuario->role = $data['role'] ?? $usuario->role;
        if (! empty($data['password'])) {
            $usuario->password = $data['password'];
        }
        $usuario->save();

        return response()->json([
            'data' => $usuario->refresh(),
            'message' => 'Usuario actualizado correctamente.',
        ]);
    }

    public function destroy(Request $request, User $usuario): JsonResponse
    {
        if ($usuario->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes eliminar tu propio usuario.'], 422);
        }

        $usuario->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente.']);
    }
}