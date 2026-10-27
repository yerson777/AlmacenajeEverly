
export const environment = {
  production: true,
  apiUrl: (() => {
    const guardado = localStorage.getItem('everly_api_url');

    if (guardado) {
      return guardado.replace(/\/+$/, '');
    }

    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8000/api';
    }

    return `${window.location.origin}/api`;
  })(),
};
