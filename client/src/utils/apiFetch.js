let csrfToken;

async function getCsrfToken() {
  if (!csrfToken) {
    const response = await window.fetch('/csrf-token', { credentials: 'include' });
    const data = await response.json();
    csrfToken = data.csrfToken;
  }
  return csrfToken;
}

export default async function apiFetch(input, init = {}) {
  const hasWindow = typeof window !== 'undefined' && window.location;
  const base = hasWindow ? window.location.href : 'http://localhost';
  const urlString = input instanceof Request ? input.url : input;
  const url = new URL(urlString, base);

  const sameOrigin = !hasWindow || url.origin === window.location.origin;
  if (sameOrigin) {
    init = { credentials: 'include', ...init };
    if (init.method && init.method.toUpperCase() !== 'GET') {
      const token = await getCsrfToken();
      init.headers = { 'CSRF-Token': token, ...(init.headers || {}) };
    }
  }

  return window.fetch(input, init);
}
