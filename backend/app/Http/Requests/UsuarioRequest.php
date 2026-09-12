<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UsuarioRequest extends FormRequest
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
        $ignore = $this->route('usuario')?->id;

        return [
            'name' => $require . '|string|max:255',
            'email' => $require . '|string|email|max:255|unique:users,email' . ($ignore ? ",{$ignore}" : ''),
            'role' => $require . '|string|' . Rule::in(User::ROLES),
            'password' => $this->isMethod('post')
                ? 'required|string|min:8|confirmed'
                : 'nullable|string|min:8|confirmed',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'name.max' => 'El nombre no debe superar los :max caracteres.',
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'Ingrese un correo electrónico válido.',
            'email.max' => 'El correo no debe superar los :max caracteres.',
            'email.unique' => 'El correo ya está registrado para otro usuario.',
            'role.required' => 'Debe seleccionar un rol.',
            'role.in' => 'El rol seleccionado no es válido.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min' => 'La contraseña debe tener al menos :min caracteres.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
        ];
    }
}