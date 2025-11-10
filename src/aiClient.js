import { buildChatPayload, buildKnowledgePayload } from './requestBuilder.js';
import { streamText } from './streaming.js';
import { loadApiKey as loadStoredApiKey } from './storage.js';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const CHAT_MODEL = 'models/gemini-pro';
const KNOWLEDGE_MODEL = 'models/gemini-1.5-pro-latest';
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

let apiKeyCache = null;

class GeminiApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status ?? null;
    this.code = code ?? 'UNKNOWN';
    this.details = details;
  }
}

function getStoredOrCachedApiKey() {
  return apiKeyCache ?? loadStoredApiKey() ?? null;
}

function requireApiKey(explicitKey) {
  const key = explicitKey ?? getStoredOrCachedApiKey();

  if (!key) {
    throw new GeminiApiError('Gemini API key is required. Please provide a key before making requests.', {
      code: 'MISSING_API_KEY'
    });
  }

  return key;
}

export function setClientApiKey(key) {
  apiKeyCache = key ?? null;
  return apiKeyCache;
}

export function getClientApiKey() {
  return getStoredOrCachedApiKey();
}

function getActionPath(model, { stream }) {
  const action = stream ? 'streamGenerateContent' : 'generateContent';
  return `${model}:${action}`;
}

async function toGeminiError(response) {
  const { status } = response;
  let payload;
  let message = `Gemini API request failed with status ${status}.`;
  let code = 'HTTP_ERROR';

  try {
    payload = await response.json();
    if (payload?.error) {
      message = payload.error.message ?? message;
      code = payload.error.status ?? payload.error.code ?? code;
    }
  } catch (error) {
    // ignore body parse errors, fall back to default message
  }

  if (status === 401 || status === 403) {
    code = 'API_KEY_INVALID';
  } else if (status === 429) {
    code = 'RATE_LIMITED';
  }

  return new GeminiApiError(message, {
    status,
    code,
    details: payload
  });
}

function shouldRetry(response) {
  return response && (RETRYABLE_STATUS.has(response.status) || response.status >= 500);
}

function isRetryableError(error) {
  if (error?.name === 'AbortError') {
    return false;
  }

  if (error instanceof GeminiApiError) {
    return error.code === 'RATE_LIMITED' || (typeof error.status === 'number' && shouldRetry({ status: error.status }));
  }

  // network errors from fetch manifest as TypeError
  return error instanceof TypeError;
}

function getBackoffDelay(attempt, baseDelay, retryAfterHeader) {
  if (retryAfterHeader) {
    const retryAfter = Number(retryAfterHeader);

    if (!Number.isNaN(retryAfter)) {
      return Math.max(baseDelay, retryAfter * 1000);
    }

    const retryDate = Date.parse(retryAfterHeader);
    if (!Number.isNaN(retryDate)) {
      return Math.max(baseDelay, retryDate - Date.now());
    }
  }

  return baseDelay * 2 ** attempt;
}

function delay(ms) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(url, options, { retries = 3, baseDelay = 500 } = {}) {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await toGeminiError(response);
        if (attempt < retries && shouldRetry(response)) {
          lastError = error;
          const backoff = getBackoffDelay(attempt, baseDelay, response.headers.get('retry-after'));
          await delay(backoff);
          attempt += 1;
          continue;
        }

        throw error;
      }

      return response;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error;
      }

      if (!isRetryableError(error) || attempt >= retries) {
        throw error;
      }

      lastError = error;
      const backoff = getBackoffDelay(attempt, baseDelay);
      await delay(backoff);
      attempt += 1;
    }
  }

  throw lastError ?? new Error('Request failed after maximum retries.');
}

function extractCandidatePayload(payload) {
  const candidates = payload?.candidates ?? [];

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { text: '', candidate: null };
  }

  const viableCandidate = candidates.find((candidate) => {
    if (!candidate?.content?.parts?.length) {
      return false;
    }

    if (candidate.finishReason === 'SAFETY') {
      return false;
    }

    return true;
  }) ?? candidates[0];

  const text = viableCandidate.content?.parts
    .map((part) => part?.text ?? '')
    .join('')
    .trim();

  return {
    text,
    candidate: viableCandidate
  };
}

function assertSafety(payload, candidate) {
  const promptFeedback = payload?.promptFeedback;

  if (promptFeedback?.blockReason && promptFeedback.blockReason !== 'BLOCK_REASON_UNSPECIFIED') {
    throw new GeminiApiError('Gemini blocked the request for safety reasons.', {
      code: 'SAFETY_BLOCKED',
      status: 400,
      details: promptFeedback
    });
  }

  if (candidate?.finishReason === 'SAFETY') {
    throw new GeminiApiError('Gemini blocked the response for safety reasons.', {
      code: 'SAFETY_BLOCKED',
      status: 400,
      details: candidate
    });
  }
}

async function consumeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new GeminiApiError('Failed to parse Gemini response body.', {
      code: 'INVALID_RESPONSE',
      details: { cause: error?.message }
    });
  }
}

async function executeRequest({
  apiKey,
  payload,
  model,
  retries,
  baseDelay,
  stream,
  signal
}) {
  const url = new URL(`${GEMINI_API_BASE_URL}/${getActionPath(model, { stream: false })}`);
  url.searchParams.set('key', apiKey);

  const response = await fetchWithRetry(
    url.toString(),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    },
    { retries, baseDelay }
  );

  return consumeJson(response);
}

async function processResponse(json, { onChunk, streamOptions, signal }) {
  const { text, candidate } = extractCandidatePayload(json);
  assertSafety(json, candidate);

  if (text && typeof onChunk === 'function') {
    await streamText(text, {
      chunkSize: streamOptions?.chunkSize,
      chunkDelay: streamOptions?.chunkDelay,
      onChunk,
      signal
    });
  }

  return {
    text,
    candidate,
    promptFeedback: json?.promptFeedback ?? null,
    raw: json
  };
}

export async function sendMessage({
  apiKey,
  prompt,
  history = [],
  knowledgeContext = [],
  systemInstruction,
  generationConfig,
  safetySettings,
  model = CHAT_MODEL,
  retries = 3,
  baseDelay = 500,
  onChunk,
  streamOptions,
  signal
} = {}) {
  const key = requireApiKey(apiKey);

  const payload = buildChatPayload({
    prompt,
    history,
    knowledgeContext,
    systemInstruction,
    generationConfig,
    safetySettings
  });

  const json = await executeRequest({
    apiKey: key,
    payload,
    model,
    retries,
    baseDelay,
    stream: Boolean(onChunk),
    signal
  });

  return processResponse(json, { onChunk, streamOptions, signal });
}

export async function searchKnowledge({
  apiKey,
  query,
  history = [],
  knowledgeContext = [],
  systemInstruction,
  generationConfig,
  safetySettings,
  retrievalConfig,
  model = KNOWLEDGE_MODEL,
  retries = 3,
  baseDelay = 700,
  onChunk,
  streamOptions,
  signal
} = {}) {
  const key = requireApiKey(apiKey);

  const payload = buildKnowledgePayload({
    query,
    history,
    knowledgeContext,
    systemInstruction,
    generationConfig,
    safetySettings,
    retrievalConfig
  });

  const json = await executeRequest({
    apiKey: key,
    payload,
    model,
    retries,
    baseDelay,
    stream: Boolean(onChunk),
    signal
  });

  return processResponse(json, { onChunk, streamOptions, signal });
}

export { GeminiApiError };
