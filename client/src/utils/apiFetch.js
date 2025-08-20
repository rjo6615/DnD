export default function apiFetch(input, init = {}) {
  const hasWindow = typeof window !== 'undefined' && window.location;
  const base = hasWindow ? window.location.href : 'http://localhost';
  const urlString = input instanceof Request ? input.url : input;
  const url = new URL(urlString, base);

  const sameOrigin = !hasWindow || url.origin === window.location.origin;
  if (sameOrigin) {
    init = { credentials: 'include', ...init };
  }

  return window.fetch(input, init);
}
