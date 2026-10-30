<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FardoRequest extends FormRequest
{
    public const ESTADOS = ['En venta', 'Agotado', 'Inactivo'];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $inputs = $this->all();

        foreach ($inputs as $key => $value) {
            if (is_string($value)) {
                $inputs[$key] = trim($value);
            }
        }

        $this->replace($inputs);
    }

    public function rules(): array
    {
        $require = $this->isMethod('put') || $this->isMethod('patch') ? 'sometimes' : 'required';
        $ignore = $this->route('fardo')?->id;

        return [
            'codigo' => 'nullable|string|max:20|unique:fardos,codigo' . ($ignore ? ",{$ignore}" : ''),
            'categoria' => $require . '|string|max:100',
            'descripcion' => 'nullable|string|max:255',
            'fecha_compra' => 'nullable|date',
            'capital_invertido' => $require . '|numeric|min:0.01',
            'cantidad_prendas' => 'nullable|integer|min:0',
            'estado' => 'nullable|string|' . Rule::in(self::ESTADOS),
            'observaciones' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.max' => 'El código no debe superar los :max caracteres.',
            'codigo.unique' => 'El código ya está en uso por otro fardo.',
            'categoria.required' => 'La categoría es obligatoria.',
            'categoria.max' => 'La categoría no debe superar los :max caracteres.',
            'descripcion.max' => 'La descripción no debe superar los :max caracteres.',
            'fecha_compra.date' => 'Ingrese una fecha válida.',
            'capital_invertido.required' => 'El capital invertido es obligatorio.',
            'capital_invertido.numeric' => 'El capital invertido debe ser un valor numérico.',
            'capital_invertido.min' => 'El capital invertido debe ser mayor a 0.',
            'cantidad_prendas.integer' => 'La cantidad de prendas debe ser un número entero.',
            'cantidad_prendas.min' => 'La cantidad de prendas no puede ser negativa.',
            'estado.in' => 'El estado del fardo no es válido.',
            'observaciones.max' => 'Las observaciones no deben superar los :max caracteres.',
        ];
    }
}