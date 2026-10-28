// Client for the third-party Banana API by Marc Conrad.
// Docs: https://marcconrad.com/uob/banana/doc.php
// Every call to the external service goes through this one file, so if the API
// changes (URL, format, field names) only this file needs updating.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

const DEFAULT_BASE_URL = 'https://marcconrad.com/uob/banana/api.php';

class BananaApiError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = 'BananaApiError';
  }
}

// Turns the raw response body into { image, solution }.
// `image` is something an <img> can show: the image URL, or a data: URL when the
// API was asked for base64 (base64=yes sends the PNG itself, so the browser does
// not need a second download from the image host).
// JSON looks like:  { "question": "https://.../x.png" or "<base64 PNG>", "solution": 7 }
// CSV looks like:   https://.../x.png,7   or   <base64 PNG>,7
function parsePuzzle(body, format, base64 = false) {
  let question;
  let solution;

  if (format === 'csv') {
    const lastComma = body.trim().lastIndexOf(',');
    if (lastComma === -1) throw new BananaApiError('CSV response has no comma');
    question = body.slice(0, lastComma).trim();
    solution = Number(body.slice(lastComma + 1).trim());
  } else {
    let data;
    try {
      data = JSON.parse(body);
    } catch (err) {
      throw new BananaApiError('Response is not valid JSON', { cause: err });
    }
    question = data.question;
    solution = data.solution;
  }

  if (typeof question !== 'string') throw new BananaApiError('Response has no question');
  let image;
  if (base64) {
    if (!/^[A-Za-z0-9+/]+=*$/.test(question) || question.length < 100) throw new BananaApiError('Response has no valid base64 image');
    image = `data:image/png;base64,${question}`;
  } else {
    if (!/^https?:\/\//.test(question)) throw new BananaApiError('Response has no valid image URL');
    image = question;
  }
  // The puzzle hides a single digit.
  if (!Number.isInteger(solution) || solution < 0 || solution > 9) {
    throw new BananaApiError('Response has no valid digit solution');
  }
  return { image, solution };
}

// fetchImpl is injectable so the tests can fake the network.
function createBananaApi({
  baseUrl = DEFAULT_BASE_URL,
  format = 'json',
  base64 = true,
  timeoutMs = 5000,
  retries = 1,
  fetchImpl = globalThis.fetch,
} = {}) {
  async function fetchPuzzle() {
    const url = `${baseUrl}?out=${format}&base64=${base64 ? 'yes' : 'no'}`;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) throw new BananaApiError(`Banana API returned HTTP ${res.status}`);
        return parsePuzzle(await res.text(), format, base64);
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
