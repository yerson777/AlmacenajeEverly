<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PedidoRequest extends FormRequest
{
    public const ESTADOS = ['Pendiente', 'Completado', 'Cancelado'];

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
        $ignore = $this->route('pedido')?->id;

        return [
            'clienta_id' => $require . '|exists:clientas,id',
            'codigo' => 'nullable|string|max:20|unique:pedidos,codigo' . ($ignore ? ",{$ignore}" : ''),
            'fecha' => 'nullable|date',
            'total' => 'nullable|numeric|min:0',
            'estado' => 'nullable|string|' . Rule::in(self::ESTADOS),
            'observaciones' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'clienta_id.required' => 'Debe seleccionar una clienta.',
            'clienta_id.exists' => 'La clienta seleccionada no existe.',
            'codigo.max' => 'El código no debe superar los :max caracteres.',
            'codigo.unique' => 'El código ya está en uso por otro pedido.',
            'fecha.date' => 'Ingrese una fecha válida.',
            'total.numeric' => 'El total debe ser un valor numérico.',
            'total.min' => 'El total no puede ser negativo.',
            'estado.in' => 'El estado del pedido no es válido.',
            'observaciones.max' => 'Las observaciones no deben superar los :max caracteres.',
        ];
    }
}