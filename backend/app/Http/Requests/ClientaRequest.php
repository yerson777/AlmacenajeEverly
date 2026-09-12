<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClientaRequest extends FormRequest
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

        return [
            'nombre' => $require . '|string|max:255|regex:/^[\p{L} ]+$/u',
            'telefono' => 'nullable|string|regex:/^[0-9]{8}$/',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'notas' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre es obligatorio.',
            'nombre.max' => 'El nombre no debe superar los :max caracteres.',
            'nombre.regex' => 'El nombre solo puede contener letras y espacios.',
            'telefono.regex' => 'El teléfono debe tener exactamente 8 dígitos.',
            'email.email' => 'Ingrese un correo electrónico válido.',
            'email.max' => 'El correo no debe superar los :max caracteres.',
            'direccion.max' => 'La dirección no debe superar los :max caracteres.',
            'notas.max' => 'Las notas no deben superar los :max caracteres.',
        ];
    }
}