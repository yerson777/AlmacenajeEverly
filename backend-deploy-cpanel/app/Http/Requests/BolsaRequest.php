<?php

namespace App\Http\Requests;

use App\Models\Bolsa;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BolsaRequest extends FormRequest
{
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
        return [
            'clienta_id' => 'required|exists:clientas,id',
            'pedido_id' => 'required|exists:pedidos,id',
            'codigo' => 'nullable|string|max:20|unique:bolsas,codigo',
            'casillero_id' => 'required|exists:casilleros,id',
            'posicion' => 'nullable|integer|min:1|max:30',
            'fecha_almacenamiento' => 'nullable|date',
            'estado' => 'nullable|string|' . Rule::in([Bolsa::ESTADO_PENDIENTE, Bolsa::ESTADO_ENTREGADA]),
            'observaciones' => 'nullable|string|max:500',
            'imagen' => 'nullable|string|max:3500000|regex:/^data:image\/[a-zA-Z0-9.+-]+;base64,/',
        ];
    }

    public function messages(): array
    {
        return [
            'clienta_id.required' => 'Debe seleccionar una clienta.',
            'clienta_id.exists' => 'La clienta seleccionada no existe.',
            'pedido_id.required' => 'Debe seleccionar un pedido.',
            'pedido_id.exists' => 'El pedido seleccionado no existe.',
            'codigo.max' => 'El código no debe superar los :max caracteres.',
            'codigo.unique' => 'El código ya está en uso por otra bolsa.',
            'casillero_id.required' => 'Debe seleccionar un casillero.',
            'casillero_id.exists' => 'El casillero seleccionado no existe.',
            'posicion.integer' => 'La posición debe ser un número entero.',
            'posicion.min' => 'La posición debe ser mayor o igual a 1.',
            'posicion.max' => 'La posición máxima es 30.',
            'fecha_almacenamiento.date' => 'Ingrese una fecha válida.',
            'estado.in' => 'El estado de la bolsa no es válido.',
            'observaciones.max' => 'Las observaciones no deben superar los :max caracteres.',
            'imagen.regex' => 'La imagen debe ser un archivo válido en formato base64.',
            'imagen.max' => 'La imagen no debe superar los 2 MB.',
        ];
    }
}