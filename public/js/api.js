// Small wrapper around fetch() for calling our own server's REST API.
// Sends and receives JSON; turns error responses into thrown ApiErrors.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const options = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body); // serialisation: object -> JSON text
  }

  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new ApiError('Cannot reach the server', 0);
  }

  const data = await res.json().catch(() => ({})); // deserialisation: JSON text -> object
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

export const api = {
  get: path => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  delete: path => request('DELETE', path),
};
