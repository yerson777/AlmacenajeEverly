<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BolsaRequest;
use App\Models\Bolsa;
use App\Models\Casillero;
use App\Models\Movimiento;
use App\Support\CodigoAutomatico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BolsaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Bolsa::with(['clienta:id,nombre,telefono', 'pedido:id,codigo', 'casillero:id,codigo']);

        if ($request->has('q') && $request->input('q') !== '') {
            $q = trim((string) $request->input('q'));
            $query->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhereHas('clienta', fn ($c) => $c->where('nombre', 'like', "%{$q}%")->orWhere('telefono', 'like', "%{$q}%"))
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', "%{$q}%"));
            });
        }

        $tab = $request->input('tab', 'pendientes');
        if ($tab === 'pendientes') {
            $query->where('estado', Bolsa::ESTADO_PENDIENTE);
        } elseif ($tab === 'entregadas') {
            $query->where('estado', Bolsa::ESTADO_ENTREGADA);
        }

        if ($request->has('mes') && $request->input('mes')) {
            $mes = (int) $request->input('mes');
            if ($mes >= 1 && $mes <= 12) {
                $query->whereMonth('fecha_almacenamiento', $mes);
            }
        }

        if ($request->has('anio') && $request->input('anio')) {
            $anio = (int) $request->input('anio');
            if ($anio > 0) {
                $query->whereYear('fecha_almacenamiento', $anio);
            }
        }

        if ($request->has('casillero_id') && $request->input('casillero_id')) {
            $query->where('casillero_id', $request->input('casillero_id'));
        }

        if ($request->has('ubicacion') && $request->input('ubicacion') !== '') {
            if ($request->input('ubicacion') === 'liberadas') {
                $query->where(function ($q) {
                    $q->whereNull('casillero_id')->orWhereNull('posicion');
                });
            } elseif ($request->input('ubicacion') === 'en_casillero') {
                $query->whereNotNull('casillero_id')->whereNotNull('posicion')->where('estado', Bolsa::ESTADO_PENDIENTE);
            }
        }

        $query->orderByDesc('fecha_almacenamiento')->orderByDesc('id');

        $perPage = 10;
        $bolsas = $query->paginate($perPage);
        $bolsas->getCollection()->each->makeHidden('imagen');

        $baseQuery = Bolsa::query();
        if ($request->has('q') && $request->input('q') !== '') {
            $q = trim((string) $request->input('q'));
            $baseQuery->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhereHas('clienta', fn ($c) => $c->where('nombre', 'like', "%{$q}%")->orWhere('telefono', 'like', "%{$q}%"))
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', "%{$q}%"));
            });
        }
        if ($request->has('mes') && $request->input('mes')) {
            $mes = (int) $request->input('mes');
            if ($mes >= 1 && $mes <= 12) {
                $baseQuery->whereMonth('fecha_almacenamiento', $mes);
            }
        }
        if ($request->has('anio') && $request->input('anio')) {
            $anio = (int) $request->input('anio');
            if ($anio > 0) {
                $baseQuery->whereYear('fecha_almacenamiento', $anio);
            }
        }
        if ($request->has('casillero_id') && $request->input('casillero_id')) {
            $baseQuery->where('casillero_id', $request->input('casillero_id'));
        }
        if ($request->has('ubicacion') && $request->input('ubicacion') !== '') {
            if ($request->input('ubicacion') === 'liberadas') {
                $baseQuery->where(function ($q) {
                    $q->whereNull('casillero_id')->orWhereNull('posicion');
                });
            } elseif ($request->input('ubicacion') === 'en_casillero') {
                $baseQuery->whereNotNull('casillero_id')->whereNotNull('posicion')->where('estado', Bolsa::ESTADO_PENDIENTE);
            }
        }

        $pendientes = (clone $baseQuery)->where('estado', Bolsa::ESTADO_PENDIENTE)->count();
        $entregadas = (clone $baseQuery)->where('estado', Bolsa::ESTADO_ENTREGADA)->count();
        $todos = (clone $baseQuery)->count();

        $response = $bolsas->toArray();
        $response['contadores'] = [
            'pendientes' => $pendientes,
            'entregadas' => $entregadas,
            'todos' => $todos,
        ];

        return response()->json($response);
    }

    public function store(BolsaRequest $request): JsonResponse
    {
        $data = $request->validated();

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

        $codigoManual = $data['codigo'] ?? null;
        unset($data['codigo']);
        $data['posicion'] = $posicion;
        $data['casillero_id'] = $casillero->id;
        $data['fecha_almacenamiento'] = $data['fecha_almacenamiento'] ?? now()->toDateString();
        $data['estado'] = $data['estado'] ?? Bolsa::ESTADO_PENDIENTE;

        $crearBolsa = function (string $codigo) use ($data, $casillero): Bolsa {
            $datos = ['codigo' => $codigo] + $data;

            return DB::transaction(function () use ($datos, $casillero) {
                $bolsa = Bolsa::create($datos);

                $casillero->bolsas()->save($bolsa);

                Movimiento::create([
                    'bolsa_id' => $bolsa->id,
                    'tipo' => Movimiento::TIPO_ALMACENADA,
                    'casillero_destino_id' => $casillero->id,
                    'posicion_destino' => $datos['posicion'],
                    'fecha' => now(),
                    'observaciones' => $datos['observaciones'] ?? null,
                ]);

                return $bolsa;
            });
        };

        $bolsa = $codigoManual
            ? $crearBolsa($codigoManual)
            : CodigoAutomatico::crear(Bolsa::class, 'VB', 3, $crearBolsa);

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
            'imagen' => 'nullable|string|max:3500000|regex:/^data:image\/[a-zA-Z0-9.+-]+;base64,/',
        ]);

        $bolsa->update($data);

        return response()->json(['data' => $bolsa->fresh(), 'message' => 'Bolsa actualizada.']);
    }

    public function entregar(Request $request, Bolsa $bolsa): JsonResponse
    {
        if ($bolsa->estado === Bolsa::ESTADO_ENTREGADA) {
            return response()->json(['message' => 'La bolsa ya fue entregada.'], 422);
        }

        $data = $request->validate([
            'observaciones' => 'nullable|string|max:500',
        ]);

        $origenCasillero = $bolsa->casillero_id;
        $origenPosicion = $bolsa->posicion;

        $bolsa = DB::transaction(function () use ($data, $bolsa, $origenCasillero, $origenPosicion) {
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
                'observaciones' => $data['observaciones'] ?? null,
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
        if ($bolsa->estado === Bolsa::ESTADO_PENDIENTE && $bolsa->posicion !== null) {
            return response()->json([
                'message' => 'No se puede eliminar una bolsa almacenada. Entréguela o muévala antes.',
            ], 422);
        }

        $bolsa->delete();

        return response()->json(['message' => 'Bolsa eliminada.']);
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