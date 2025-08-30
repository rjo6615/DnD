let csrfToken;
const apiBaseUrl = process.env.REACT_APP_API_URL;
const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : null;

async function getCsrfToken() {
  if (!csrfToken) {
    const tokenUrl = apiBaseUrl
      ? new URL('/csrf-token', apiBaseUrl).toString()
      : '/csrf-token';
    const response = await window.fetch(tokenUrl, { credentials: 'include' });
    const data = await response.json();
    csrfToken = data.csrfToken;
  }
  return csrfToken;
}

export default async function apiFetch(input, init = {}) {
  const hasWindow = typeof window !== 'undefined' && window.location;
  const base = apiBaseUrl || (hasWindow ? window.location.origin : 'http://localhost');
  const urlString = input instanceof Request ? input.url : input;
  const url = new URL(urlString, base);

  const sameOrigin = hasWindow && url.origin === window.location.origin;
  const apiRequest = apiOrigin && url.origin === apiOrigin;
  if (!hasWindow || sameOrigin || apiRequest) {
    init = { credentials: 'include', ...init };
    if (init.method && init.method.toUpperCase() !== 'GET') {
      const token = await getCsrfToken();
      init.headers = { 'CSRF-Token': token, ...(init.headers || {}) };
    }
  }

  let finalInput;
  if (input instanceof Request) {
    finalInput = new Request(url.toString(), input);
  } else if (apiBaseUrl) {
    finalInput = url.toString();
  } else {
    finalInput = urlString;
  }
  return window.fetch(finalInput, init);
}
