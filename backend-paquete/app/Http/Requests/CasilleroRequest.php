<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CasilleroRequest extends FormRequest
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
        $require = $this->isMethod('put') || $this->isMethod('patch') ? 'sometimes' : 'required';
        $ignore = $this->route('casillero')?->id;

        return [
            'codigo' => $require . '|string|max:20|unique:casilleros,codigo' . ($ignore ? ",{$ignore}" : ''),
            'descripcion' => 'nullable|string|max:255',
            'capacidad' => 'nullable|integer|min:1|max:30',
            'activo' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.required' => 'El código es obligatorio.',
            'codigo.max' => 'El código no debe superar los :max caracteres.',
            'codigo.unique' => 'El código ya está en uso por otro casillero.',
            'descripcion.max' => 'La descripción no debe superar los :max caracteres.',
            'capacidad.integer' => 'La capacidad debe ser un número entero.',
            'capacidad.min' => 'La capacidad mínima es 1.',
            'capacidad.max' => 'La capacidad máxima es 30.',
            'activo.boolean' => 'El estado del casillero es inválido.',
        ];
    }
}