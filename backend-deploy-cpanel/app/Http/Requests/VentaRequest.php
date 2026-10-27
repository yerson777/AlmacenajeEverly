<?php

namespace App\Http\Requests;

use App\Models\Pedido;
use App\Models\Venta;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VentaRequest extends FormRequest
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
            'fardo_id' => $require . '|exists:fardos,id',
            'clienta_id' => 'nullable|exists:clientas,id',
            'pedido_id' => 'nullable|exists:pedidos,id',
            'monto' => $require . '|numeric|min:0.01',
            'forma_pago' => [$require, Rule::in(Venta::FORMAS_PAGO)],
            'fecha' => $require . '|date',
            'observaciones' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'fardo_id.required' => 'Debe seleccionar un fardo.',
            'fardo_id.exists' => 'El fardo seleccionado no existe.',
            'clienta_id.exists' => 'La clienta seleccionada no existe.',
            'pedido_id.exists' => 'El pedido seleccionado no existe.',
            'monto.required' => 'El monto es obligatorio.',
            'monto.numeric' => 'El monto debe ser un valor numérico.',
            'monto.min' => 'El monto debe ser mayor a 0.',
            'forma_pago.required' => 'Debe seleccionar la forma de pago.',
            'forma_pago.in' => 'La forma de pago no es válida.',
            'fecha.required' => 'La fecha es obligatoria.',
            'fecha.date' => 'Ingrese una fecha válida.',
            'observaciones.max' => 'Las observaciones no deben superar los :max caracteres.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $pedidoId = $this->input('pedido_id');
            $clientaId = $this->input('clienta_id');

            if ($pedidoId && ! $clientaId) {
                $validator->errors()->add('clienta_id', 'Debe indicar la clienta del pedido.');
            }

            if ($pedidoId && $clientaId) {
                $pedido = Pedido::find($pedidoId);
                if ($pedido && (int) $pedido->clienta_id !== (int) $clientaId) {
                    $validator->errors()->add('pedido_id', 'El pedido no pertenece a la clienta seleccionada.');
                }
            }
        });
    }
}