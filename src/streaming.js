function sleep(duration, signal) {
  if (duration <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, duration);

    function cleanup() {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    }

    function onAbort() {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    }

    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export async function* chunkText(text, chunkSize = 64) {
  if (!text) {
    return;
  }

  const safeSize = Math.max(8, chunkSize);

  for (let index = 0; index < text.length; index += safeSize) {
    yield text.slice(index, index + safeSize);
  }
}

export async function streamText(text, { chunkSize = 64, chunkDelay = 45, onChunk, signal } = {}) {
  if (typeof onChunk !== 'function') {
    return;
  }

  for await (const chunk of chunkText(text, chunkSize)) {
    await sleep(chunkDelay, signal);
    onChunk(chunk);
  }
}

export async function withLoadingIndicator(callback, { onStart, onComplete, onError } = {}) {
  try {
    onStart?.();
    const result = await callback();
    onComplete?.();
    return result;
  } catch (error) {
    onError?.(error);
    throw error;
  }
}
