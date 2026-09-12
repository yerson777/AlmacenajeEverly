type Valor = string | number | boolean | null | undefined;
export type Validator = (v: Valor) => string | null;
export type ReglasPorCampo = Record<string, Validator[]>;

export function requerido(msg = 'Este campo es obligatorio.'): Validator {
  return (v) => (v === null || v === undefined || String(v).trim() === '' ? msg : null);
}

export function noSoloEspacios(msg = 'Este campo no puede contener solo espacios.'): Validator {
  return (v) => (typeof v === 'string' && v.trim() !== '' && v.trim() !== v ? msg : null);
}

export function maxLong(max: number, msg?: string): Validator {
  const m = msg ?? `No puede superar los ${max} caracteres.`;
  return (v) => (typeof v === 'string' && v.length > max ? m : null);
}

export function minLong(min: number, msg?: string): Validator {
  const m = msg ?? `Debe tener al menos ${min} caracteres.`;
  return (v) => (typeof v === 'string' && v.trim().length < min && v.trim() !== '' ? m : null);
}

export function soloLetras(msg = 'Solo se permiten letras y espacios.'): Validator {
  const re = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;
  return (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    return re.test(String(v).trim()) ? null : msg;
  };
}

export function soloDigitos(contar = 0, msg?: string): Validator {
  const re = contar ? new RegExp(`^[0-9]{${contar}}$`) : /^[0-9]+$/;
  const m = msg ?? (contar ? `Debe tener exactamente ${contar} dígitos.` : 'Solo se permiten números.');
  return (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    return re.test(String(v).trim()) ? null : m;
  };
}

export function emailOk(msg = 'Ingrese un correo electrónico válido.'): Validator {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (v) => (typeof v === 'string' && v.trim() !== '' && !re.test(v.trim()) ? msg : null);
}

export function noNegativo(msg = 'Debe ser mayor o igual a 0.'): Validator {
  return (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    return n < 0 ? msg : null;
  };
}

export function positivo(msg = 'Debe ser mayor a 0.'): Validator {
  return (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    return n <= 0 ? msg : null;
  };
}

export function entero(msg = 'Debe ser un número entero.'): Validator {
  return (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    return !Number.isInteger(n) ? msg : null;
  };
}

export function fechaValida(msg = 'Ingrese una fecha válida.'): Validator {
  return (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    if (typeof v !== 'string') return null;
    const partes = v.split('-');
    if (partes.length !== 3) return msg;
    const [anio, mes, dia] = partes.map(Number);
    if (!anio || !mes || !dia || mes < 1 || mes > 12 || dia < 1 || dia > 31) return msg;
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return msg;
    return null;
  };
}

function validaciones(value: Valor, validadores: Validator[]): string | null {
  for (const fn of validadores) {
    const err = fn(value);
    if (err) return err;
  }
  return null;
}

export function validarTodo(obj: Record<string, Valor>, reglas: ReglasPorCampo): { ok: boolean; errores: Record<string, string> } {
  const errores: Record<string, string> = {};
  let ok = true;
  for (const campo of Object.keys(reglas)) {
    const err = validaciones(obj[campo] ?? '', reglas[campo]);
    if (err) {
      errores[campo] = err;
      ok = false;
    }
  }
  return { ok, errores };
}

export function errVisible(err: string | null | undefined, valor: Valor, intentado: boolean): string | null {
  if (!intentado) return null;
  return err ?? null;
}