<?php

namespace App\Http\Requests;

use App\Models\Clienta;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
                $inputs[$key] = trim((string) preg_replace('/\s+/u', ' ', $value));
            }
        }

        if (isset($inputs['telefono']) && is_string($inputs['telefono'])) {
            $inputs['telefono'] = (string) preg_replace('/[\s\-().]/', '', $inputs['telefono']);
        }

        if (isset($inputs['email']) && is_string($inputs['email'])) {
            $inputs['email'] = mb_strtolower($inputs['email']);
        }

        $this->replace($inputs);
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('put') || $this->isMethod('patch');
        $require = $isUpdate ? 'sometimes' : 'required';

        $clienta = $this->route('clienta');
        $ignoreId = $clienta instanceof Clienta ? $clienta->id : $clienta;

        return [
            'nombre' => [$require, 'string', 'max:255', 'regex:/^[\p{L} ]+$/u'],
            'telefono' => [
                'nullable',
                'string',
                'regex:/^[0-9]{8}$/',
                Rule::unique('clientas', 'telefono')->ignore($ignoreId),
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('clientas', 'email')->ignore($ignoreId),
            ],
            'direccion' => ['nullable', 'string', 'max:255'],
            'notas' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre es obligatorio.',
            'nombre.max' => 'El nombre no debe superar los :max caracteres.',
            'nombre.regex' => 'El nombre solo puede contener letras y espacios.',
            'telefono.regex' => 'El teléfono debe tener exactamente 8 dígitos.',
            'telefono.unique' => 'Ya existe una clienta registrada con ese teléfono.',
            'email.email' => 'Ingrese un correo electrónico válido.',
            'email.max' => 'El correo no debe superar los :max caracteres.',
            'email.unique' => 'Ya existe una clienta registrada con ese correo.',
            'direccion.max' => 'La dirección no debe superar los :max caracteres.',
            'notas.max' => 'Las notas no deben superar los :max caracteres.',
        ];
    }
}
