<?php

namespace App\Support;

use Illuminate\Database\QueryException;

final class ErroresBd
{
    /**
     * Traduce errores de base de datos a mensajes seguros para el usuario.
     * El detalle técnico queda únicamente en los logs de Laravel.
     *
     * @return array{status: int, message: string, errors?: array<string, array<int, string>>}
     */
    public static function respuesta(QueryException $e): array
    {
        $codigo = (int) ($e->errorInfo[1] ?? 0);

        if ($codigo === 1062) {
            return self::duplicado($e);
        }

        if (in_array($codigo, [1451, 1452], true)) {
            return [
                'status' => 422,
                'message' => 'No se puede completar la operación porque el registro está relacionado con otros datos.',
            ];
        }

        if ($codigo === 3819) {
            return [
                'status' => 422,
                'message' => 'Los datos no cumplen una regla de validación. Verifique los valores ingresados.',
            ];
        }

        return [
            'status' => 500,
            'message' => 'No se pudo completar la operación. Intente nuevamente.',
        ];
    }

    /**
     * @return array{status: int, message: string, errors?: array<string, array<int, string>>}
     */
    private static function duplicado(QueryException $e): array
    {
        $indice = self::indice($e);

        if (str_contains($indice, 'pedidos') && str_contains($indice, 'codigo')) {
            return self::campo('codigo', 'Ya existe un pedido con ese código.');
        }

        if (str_contains($indice, 'bolsas') && str_contains($indice, 'codigo')) {
            return self::campo('codigo', 'Ya existe una bolsa con ese código.');
        }

        if (str_contains($indice, 'bolsas') && str_contains($indice, 'pedido')) {
            return self::campo('pedido_id', 'Este pedido ya tiene una bolsa registrada.');
        }

        if (str_contains($indice, 'casillero') && str_contains($indice, 'posicion')) {
            return self::campo('posicion', 'Esa posición del casillero ya está ocupada.');
        }

        if (str_contains($indice, 'fardos') && str_contains($indice, 'codigo')) {
            return self::campo('codigo', 'Ya existe un fardo con ese código.');
        }

        if (str_contains($indice, 'casilleros') && str_contains($indice, 'codigo')) {
            return self::campo('codigo', 'Ya existe un casillero con ese código.');
        }

        if (str_contains($indice, 'users') && str_contains($indice, 'email')) {
            return self::campo('email', 'El correo ya está registrado para otro usuario.');
        }

        if (str_contains($indice, 'clientas') && str_contains($indice, 'telefono')) {
            return self::campo('telefono', 'Ya existe una clienta registrada con ese teléfono.');
        }

        if (str_contains($indice, 'clientas') && str_contains($indice, 'email')) {
            return self::campo('email', 'Ya existe una clienta registrada con ese correo.');
        }

        return [
            'status' => 422,
            'message' => 'Ya existe un registro con esos datos. Verifique e intente nuevamente.',
        ];
    }

    private static function indice(QueryException $e): string
    {
        $mensaje = $e->getMessage();

        if (preg_match("/for key '([^']+)'/i", $mensaje, $coincidencias)) {
            return strtolower($coincidencias[1]);
        }

        return strtolower($mensaje);
    }

    /**
     * @return array{status: int, message: string, errors: array<string, array<int, string>>}
     */
    private static function campo(string $campo, string $mensaje): array
    {
        return [
            'status' => 422,
            'message' => $mensaje,
            'errors' => [$campo => [$mensaje]],
        ];
    }
}
