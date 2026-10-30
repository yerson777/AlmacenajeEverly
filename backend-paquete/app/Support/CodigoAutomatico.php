<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use RuntimeException;

final class CodigoAutomatico
{
    private const INTENTOS = 5;

    /**
     * Genera el siguiente código numérico disponible para un prefijo.
     * Ignora códigos manuales que no respetan el formato PREFIJO-000.
     *
     * @param  class-string<Model>  $modelo
     */
    public static function siguiente(string $modelo, string $prefijo, int $relleno = 3): string
    {
        $patron = '/^' . preg_quote($prefijo, '/') . '-(\d+)$/';

        $maximo = $modelo::query()
            ->where('codigo', 'like', $prefijo . '-%')
            ->pluck('codigo')
            ->reduce(function (int $max, mixed $codigo) use ($patron): int {
                return preg_match($patron, (string) $codigo, $coincidencias)
                    ? max($max, (int) $coincidencias[1])
                    : $max;
            }, 0);

        do {
            $maximo++;
            $codigo = $prefijo . '-' . str_pad((string) $maximo, $relleno, '0', STR_PAD_LEFT);
        } while ($modelo::query()->where('codigo', $codigo)->exists());

        return $codigo;
    }

    /**
     * Crea un registro con un código automático y reintenta si otro
     * proceso ocupó el número entre la consulta y el guardado.
     *
     * @template T
     *
     * @param  class-string<Model>  $modelo
     * @param  callable(string): T  $crear
     * @return T
     */
    public static function crear(string $modelo, string $prefijo, int $relleno, callable $crear): mixed
    {
        for ($intento = 1; $intento <= self::INTENTOS; $intento++) {
            $codigo = self::siguiente($modelo, $prefijo, $relleno);

            try {
                return $crear($codigo);
            } catch (UniqueConstraintViolationException $e) {
                $ocupado = $modelo::query()->where('codigo', $codigo)->exists();

                if ($intento === self::INTENTOS || ! $ocupado) {
                    throw $e;
                }
            }
        }

        throw new RuntimeException('No se pudo generar un código único.');
    }
}
