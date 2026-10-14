// Client for the third-party Banana API by Marc Conrad.
// Docs: https://marcconrad.com/uob/banana/doc.php
// Every call to the external service goes through this one file, so if the API
// changes (URL, format, field names) only this file needs updating.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const DEFAULT_BASE_URL = 'https://marcconrad.com/uob/banana/api.php';

class BananaApiError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = 'BananaApiError';
  }
}

// Turns the raw response body into { imageUrl, solution }.
// JSON looks like:  { "question": "https://.../x.png", "solution": 7 }
// CSV looks like:   https://.../x.png,7
function parsePuzzle(body, format) {
  let imageUrl;
  let solution;

  if (format === 'csv') {
    const lastComma = body.trim().lastIndexOf(',');
    if (lastComma === -1) throw new BananaApiError('CSV response has no comma');
    imageUrl = body.slice(0, lastComma).trim();
    solution = Number(body.slice(lastComma + 1).trim());
  } else {
    let data;
    try {
      data = JSON.parse(body);
    } catch (err) {
      throw new BananaApiError('Response is not valid JSON', { cause: err });
    }
    imageUrl = data.question;
    solution = data.solution;
  }

  if (typeof imageUrl !== 'string' || !/^https?:\/\//.test(imageUrl)) {
    throw new BananaApiError('Response has no valid image URL');
  }
  if (!Number.isInteger(solution)) {
    throw new BananaApiError('Response has no valid integer solution');
  }
  return { imageUrl, solution };
}

// fetchImpl is injectable so the tests can fake the network.
function createBananaApi({
  baseUrl = DEFAULT_BASE_URL,
  format = 'json',
  timeoutMs = 5000,
  retries = 1,
  fetchImpl = globalThis.fetch,
} = {}) {
  async function fetchPuzzle() {
    const url = `${baseUrl}?out=${format}`;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) throw new BananaApiError(`Banana API returned HTTP ${res.status}`);
        return parsePuzzle(await res.text(), format);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof BananaApiError
      ? lastError
      : new BananaApiError('Banana API is unreachable', { cause: lastError });
  }

  return { fetchPuzzle };
}

module.exports = { createBananaApi, parsePuzzle, BananaApiError, DEFAULT_BASE_URL };
