<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bolsa;
use App\Models\Casillero;
use App\Models\Movimiento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BolsaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Bolsa::with(['clienta:id,nombre,telefono', 'pedido:id,codigo', 'casillero:id,codigo'])
            ->latest('id');

        if ($request->has('q') && $request->input('q') !== '') {
            $q = $request->input('q');
            $query->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhereHas('clienta', fn ($c) => $c->where('nombre', 'like', "%{$q}%")->orWhere('telefono', 'like', "%{$q}%"))
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', "%{$q}%"));
            });
        }

        $bolsas = $query->paginate(50);

        return response()->json($bolsas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'clienta_id' => 'required|exists:clientas,id',
            'pedido_id' => 'required|exists:pedidos,id',
            'codigo' => 'nullable|string|max:20|unique:bolsas,codigo',
            'casillero_id' => 'required|exists:casilleros,id',
            'posicion' => 'nullable|integer|min:1',
            'fecha_almacenamiento' => 'nullable|date',
            'estado' => 'nullable|string|max:50',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $clientaId = $data['clienta_id'];
        $pedido = \App\Models\Pedido::with('clienta')->findOrFail($data['pedido_id']);

        if ($pedido->clienta_id !== $clientaId) {
            throw ValidationException::withMessages([
                'pedido_id' => 'El pedido no pertenece a la clienta seleccionada.',
            ]);
        }

        $casillero = Casillero::findOrFail($data['casillero_id']);

        if (! $casillero->activo) {
            throw ValidationException::withMessages([
                'casillero_id' => 'El casillero está desactivado.',
            ]);
        }

        $usadas = $this->posicionesOcupadas($casillero);
        $posicion = $data['posicion'] ?? null;

        if ($posicion !== null) {
            if ($posicion > $casillero->capacidad) {
                throw ValidationException::withMessages([
                    'posicion' => "La posición debe estar entre 1 y {$casillero->capacidad}.",
                ]);
            }

            if (in_array($posicion, $usadas, true)) {
                throw ValidationException::withMessages([
                    'posicion' => "La posición {$posicion} del casillero {$casillero->codigo} ya está ocupada.",
                ]);
            }
        } else {
            $posicion = $this->primeraPosicionLibre($casillero);
            if ($posicion === null) {
                return response()->json(['message' => "El casillero {$casillero->codigo} está lleno."], 422);
            }
        }

        $data['codigo'] = $data['codigo'] ?? $this->generarCodigo();
        $data['posicion'] = $posicion;
        $data['casillero_id'] = $casillero->id;
        $data['fecha_almacenamiento'] = $data['fecha_almacenamiento'] ?? now()->toDateString();
        $data['estado'] = $data['estado'] ?? Bolsa::ESTADO_PENDIENTE;

        $bolsa = DB::transaction(function () use ($data, $casillero, $posicion) {
            $bolsa = Bolsa::create($data);

            $casillero->bolsas()->save($bolsa);

            Movimiento::create([
                'bolsa_id' => $bolsa->id,
                'tipo' => Movimiento::TIPO_ALMACENADA,
                'casillero_destino_id' => $casillero->id,
                'posicion_destino' => $posicion,
                'fecha' => now(),
                'observaciones' => $data['observaciones'] ?? null,
            ]);

            return $bolsa;
        });

        return response()->json([
            'data' => $bolsa->load(['clienta', 'pedido', 'casillero']),
            'message' => "Bolsa {$bolsa->codigo} almacenada en {$casillero->codigo} / posición {$posicion}.",
        ], 201);
    }

    public function show(Bolsa $bolsa): JsonResponse
    {
        $bolsa->load(['clienta', 'pedido', 'casillero', 'movimientos' => fn ($q) => $q->with('casilleroOrigen:id,codigo', 'casilleroDestino:id,codigo')->latest()]);

        return response()->json(['data' => $bolsa]);
    }

    public function update(Request $request, Bolsa $bolsa): JsonResponse
    {
        $data = $request->validate([
            'observaciones' => 'nullable|string|max:500',
            'fecha_almacenamiento' => 'nullable|date',
        ]);

        $bolsa->update($data);

        return response()->json(['data' => $bolsa->fresh(), 'message' => 'Bolsa actualizada.']);
    }

    public function entregar(Request $request, Bolsa $bolsa): JsonResponse
    {
        if ($bolsa->estado === Bolsa::ESTADO_ENTREGADA) {
            return response()->json(['message' => 'La bolsa ya fue entregada.'], 422);
        }

        $origenCasillero = $bolsa->casillero_id;
        $origenPosicion = $bolsa->posicion;

        $bolsa = DB::transaction(function () use ($request, $bolsa, $origenCasillero, $origenPosicion) {
            $bolsa->update([
                'estado' => Bolsa::ESTADO_ENTREGADA,
                'casillero_id' => null,
                'posicion' => null,
            ]);

            Movimiento::create([
                'bolsa_id' => $bolsa->id,
                'tipo' => Movimiento::TIPO_ENTREGADA,
                'casillero_origen_id' => $origenCasillero,
                'posicion_origen' => $origenPosicion,
                'fecha' => now(),
                'observaciones' => $request->input('observaciones'),
            ]);

            return $bolsa;
        });

        return response()->json([
            'data' => $bolsa->load(['clienta', 'pedido', 'casillero']),
            'message' => "Bolsa entregada. Posición {$origenPosicion} de casillero liberada.",
        ]);
    }

    public function mover(Request $request, Bolsa $bolsa): JsonResponse
    {
        if ($bolsa->estado === Bolsa::ESTADO_ENTREGADA) {
            return response()->json(['message' => 'No se puede mover una bolsa ya entregada.'], 422);
        }

        $data = $request->validate([
            'casillero_id' => 'required|exists:casilleros,id',
            'posicion' => 'nullable|integer|min:1',
        ]);

        $casillero = Casillero::findOrFail($data['casillero_id']);

        if (! $casillero->activo) {
            throw ValidationException::withMessages(['casillero_id' => 'El casillero está desactivado.']);
        }

        $usadas = $this->posicionesOcupadas($casillero);
        $posicion = $data['posicion'] ?? null;

        if ($posicion !== null) {
            if ($posicion > $casillero->capacidad) {
                throw ValidationException::withMessages([
                    'posicion' => "La posición debe estar entre 1 y {$casillero->capacidad}.",
                ]);
            }

            if (in_array($posicion, $usadas, true)) {
                throw ValidationException::withMessages([
                    'posicion' => "La posición {$posicion} del casillero {$casillero->codigo} ya está ocupada.",
                ]);
            }
        } else {
            $posicion = $this->primeraPosicionLibre($casillero);
            if ($posicion === null) {
                return response()->json(['message' => "El casillero {$casillero->codigo} está lleno."], 422);
            }
        }

        if ($bolsa->casillero_id === $casillero->id && $bolsa->posicion === $posicion) {
            return response()->json(['message' => 'La bolsa ya se encuentra en esa posición.'], 422);
        }

        $origenCasillero = $bolsa->casillero_id;
        $origenPosicion = $bolsa->posicion;

        DB::transaction(function () use ($request, $bolsa, $casillero, $posicion, $origenCasillero, $origenPosicion) {
            $bolsa->update([
                'casillero_id' => $casillero->id,
                'posicion' => $posicion,
            ]);

            Movimiento::create([
                'bolsa_id' => $bolsa->id,
                'tipo' => Movimiento::TIPO_MOVIDA,
                'casillero_origen_id' => $origenCasillero,
                'posicion_origen' => $origenPosicion,
                'casillero_destino_id' => $casillero->id,
                'posicion_destino' => $posicion,
                'fecha' => now(),
                'observaciones' => $request->input('observaciones'),
            ]);
        });

        return response()->json([
            'data' => $bolsa->refresh()->load(['clienta', 'pedido', 'casillero']),
            'message' => "Bolsa movida a {$casillero->codigo} / posición {$posicion}.",
        ]);
    }

    public function destroy(Bolsa $bolsa): JsonResponse
    {
        $bolsa->delete();

        return response()->json(['message' => 'Bolsa eliminada.']);
    }

    protected function generarCodigo(): string
    {
        $ultimo = Bolsa::latest('id')->value('codigo');
        $numero = $ultimo ? ((int) substr($ultimo, -3)) + 1 : 1;

        return 'VB-' . str_pad((string) $numero, 3, '0', STR_PAD_LEFT);
    }

    protected function posicionesOcupadas(Casillero $casillero): array
    {
        return Bolsa::where('casillero_id', $casillero->id)
            ->where('estado', Bolsa::ESTADO_PENDIENTE)
            ->whereNotNull('posicion')
            ->pluck('posicion')
            ->map(fn ($p) => (int) $p)
            ->all();
    }

    protected function primeraPosicionLibre(Casillero $casillero): ?int
    {
        $ocupadas = $this->posicionesOcupadas($casillero);

        for ($i = 1; $i <= $casillero->capacidad; $i++) {
            if (! in_array($i, $ocupadas, true)) {
                return $i;
            }
        }

        return null;
    }
}