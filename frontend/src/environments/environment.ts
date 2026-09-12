const PUERTO_API = 8000;

function urlApi(): string {
  const guardado = localStorage.getItem('everly_api_url');
  if (guardado) return guardado.replace(/\/+$/, '');

  const host = window.location.hostname || 'localhost';

  // Port forwarding de GitHub Codespaces / VS Code:
  // https://<hash>-<PUERTO>.app.github.dev → el backend es <hash>-8000.app.github.dev
  const fwd = host.match(/^(.+-)?(\d+)(\.app\.github\.dev|\.preview\.app\.github\.dev|\.githubpreview\.dev)$/i);
  if (fwd) {
    const prefijo = fwd[1] ?? '';
    return `${window.location.protocol}//${prefijo}${PUERTO_API}${fwd[3]}/api`;
  }

  return `${window.location.protocol}//${host}:${PUERTO_API}/api`;
}

export const environment = {
  production: true,
  apiUrl: urlApi(),
};