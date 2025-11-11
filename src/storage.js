const STORAGE_KEY = 'gemini.apiKey';
let inMemoryKey = null;

function hasWindowStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function validateApiKey(candidate) {
  if (!candidate) {
    return {
      valid: false,
      reason: 'API key is required.'
    };
  }

  const trimmed = candidate.trim();

  if (trimmed.length < 20) {
    return {
      valid: false,
      reason: 'API key appears to be too short.'
    };
  }

  if (!/^[A-Za-z0-9_\-]+$/.test(trimmed)) {
    return {
      valid: false,
      reason: 'API key may only include letters, numbers, dashes, or underscores.'
    };
  }

  return {
    valid: true,
    value: trimmed
  };
}

export function saveApiKey(candidate) {
  const validation = validateApiKey(candidate);

  if (!validation.valid) {
    const error = new Error(validation.reason);
    error.code = 'INVALID_API_KEY';
    throw error;
  }

  const key = validation.value;

  if (hasWindowStorage()) {
    const payload = JSON.stringify({
      key,
      savedAt: new Date().toISOString()
    });
    window.localStorage.setItem(STORAGE_KEY, payload);
  } else {
    inMemoryKey = key;
  }

  return key;
}

export function loadApiKey() {
  if (hasWindowStorage()) {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored);
      return parsed?.key ?? null;
    } catch (error) {
      console.warn('Failed to parse stored API key, clearing entry.', error);
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  return inMemoryKey;
}

export function clearApiKey() {
  if (hasWindowStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  inMemoryKey = null;
}

export function hasApiKey() {
  return Boolean(loadApiKey());
}
