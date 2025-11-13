import {
  sendMessage,
  searchKnowledge,
  setClientApiKey,
  GeminiApiError
} from './aiClient.js';
import { saveApiKey, loadApiKey, clearApiKey, validateApiKey } from './storage.js';

const conversationHistory = [];

const elements = {
  keyForm: document.getElementById('api-key-form'),
  keyInput: document.getElementById('api-key-input'),
  keyClear: document.getElementById('api-key-clear'),
  keyStatus: document.getElementById('api-key-status'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  chatKnowledge: document.getElementById('chat-knowledge'),
  chatOutput: document.getElementById('chat-output'),
  chatLoading: document.getElementById('chat-loading'),
  knowledgeForm: document.getElementById('knowledge-form'),
  knowledgeQuery: document.getElementById('knowledge-query'),
  knowledgeContext: document.getElementById('knowledge-context'),
  knowledgeOutput: document.getElementById('knowledge-output'),
  knowledgeLoading: document.getElementById('knowledge-loading')
};

function setStatus(element, message, type = 'neutral') {
  if (!element) return;
  element.textContent = message;
  element.classList.remove('error', 'success');

  if (type === 'error') {
    element.classList.add('error');
  } else if (type === 'success') {
    element.classList.add('success');
  }
}

function showLoading(element, visible) {
  if (!element) return;
  element.classList.toggle('hidden', !visible);
}

function maskKeyInput(value) {
  if (!elements.keyInput) return;
  if (!value) {
    elements.keyInput.value = '';
    elements.keyInput.dataset.masked = 'false';
    return;
  }

  elements.keyInput.value = '••••••••••';
  elements.keyInput.dataset.masked = 'true';
}

function ensureKeyInputReady() {
  if (!elements.keyInput) return;
  if (elements.keyInput.dataset.masked === 'true') {
    elements.keyInput.value = '';
    elements.keyInput.dataset.masked = 'false';
  }
}

elements.keyInput?.addEventListener('focus', ensureKeyInputReady);

elements.keyInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    ensureKeyInputReady();
  }
});

function appendMessage(container, role, text) {
  if (!container) return null;

  const message = document.createElement('article');
  message.className = `message ${role}`;

  const title = document.createElement('div');
  title.className = 'message-title';
  title.textContent = role === 'user' ? 'You' : 'Gemini';

  const body = document.createElement('p');
  body.className = 'message-body';
  body.textContent = text ?? '';

  message.appendChild(title);
  message.appendChild(body);
  container.appendChild(message);

  container.scrollTop = container.scrollHeight;

  return body;
}

function parseKnowledgeContext(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/\n\s*\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function handleChatSubmit(event) {
  event.preventDefault();

  const message = elements.chatInput?.value?.trim();
  if (!message) {
    return;
  }

  const knowledgeContext = parseKnowledgeContext(elements.chatKnowledge?.value);

  appendMessage(elements.chatOutput, 'user', message);
  const assistantBody = appendMessage(elements.chatOutput, 'assistant', '');

  showLoading(elements.chatLoading, true);
  setStatus(elements.keyStatus, '');

  try {
    const response = await sendMessage({
      prompt: message,
      knowledgeContext,
      history: conversationHistory,
      onChunk: (chunk) => {
        if (assistantBody) {
          assistantBody.textContent += chunk;
        }
      },
      streamOptions: {
        chunkSize: 48,
        chunkDelay: 35
      }
    });

    const replyText = response.text ?? '';

    if (assistantBody && !replyText) {
      assistantBody.textContent = '[No response received]';
    }

    conversationHistory.push({ role: 'user', parts: [message] });
    conversationHistory.push({ role: 'assistant', parts: [replyText] });

    console.groupCollapsed('Gemini Chat Response');
    console.log('Prompt', message);
    console.log('Response', response);
    console.groupEnd();
  } catch (error) {
    const errorMessage = formatError(error);
    if (assistantBody) {
      assistantBody.textContent = `⚠️ ${errorMessage}`;
    }

    console.error('Gemini chat request failed:', error);
  } finally {
    showLoading(elements.chatLoading, false);
    if (elements.chatInput) {
      elements.chatInput.value = '';
    }
  }
}

async function handleKnowledgeSubmit(event) {
  event.preventDefault();

  const query = elements.knowledgeQuery?.value?.trim();
  if (!query) {
    return;
  }

  const knowledgeContext = parseKnowledgeContext(elements.knowledgeContext?.value);

  appendMessage(elements.knowledgeOutput, 'user', query);
  const outputBody = appendMessage(elements.knowledgeOutput, 'assistant', '');

  showLoading(elements.knowledgeLoading, true);

  try {
    const response = await searchKnowledge({
      query,
      knowledgeContext,
      history: conversationHistory,
      onChunk: (chunk) => {
        if (outputBody) {
          outputBody.textContent += chunk;
        }
      },
      streamOptions: {
        chunkSize: 54,
        chunkDelay: 40
      }
    });

    if (!response.text && outputBody) {
      outputBody.textContent = '[No knowledge results received]';
    }

    console.groupCollapsed('Gemini Knowledge Response');
    console.log('Query', query);
    console.log('Response', response);
    console.groupEnd();
  } catch (error) {
    const errorMessage = formatError(error);
    if (outputBody) {
      outputBody.textContent = `⚠️ ${errorMessage}`;
    }
    console.error('Gemini knowledge request failed:', error);
  } finally {
    showLoading(elements.knowledgeLoading, false);
    if (elements.knowledgeQuery) {
      elements.knowledgeQuery.value = '';
    }
  }
}

function formatError(error) {
  if (!error) {
    return 'Unknown error occurred.';
  }

  if (error instanceof GeminiApiError) {
    if (error.code === 'API_KEY_INVALID') {
      return 'The provided API key was rejected. Please verify the key and try again.';
    }

    if (error.code === 'RATE_LIMITED') {
      return 'Request throttled by the API. Please wait a moment and retry.';
    }

    if (error.code === 'SAFETY_BLOCKED') {
      return 'The request was blocked by Gemini safety filters.';
    }

    return error.message;
  }

  return error.message ?? 'Unexpected error occurred.';
}

function handleKeySubmit(event) {
  event.preventDefault();
  if (!elements.keyInput) return;

  const value = elements.keyInput.dataset.masked === 'true' ? '' : elements.keyInput.value;
  const trimmed = value?.trim();
  const validation = validateApiKey(trimmed);

  if (!validation.valid) {
    setStatus(elements.keyStatus, validation.reason, 'error');
    return;
  }

  try {
    const saved = saveApiKey(validation.value);
    setClientApiKey(saved);
    maskKeyInput(saved);
    setStatus(elements.keyStatus, 'API key saved locally.', 'success');
  } catch (error) {
    setStatus(elements.keyStatus, formatError(error), 'error');
  }
}

function handleKeyClear() {
  clearApiKey();
  setClientApiKey(null);
  maskKeyInput('');
  setStatus(elements.keyStatus, 'Cleared stored API key.');
}

function initialiseFromStorage() {
  const storedKey = loadApiKey();
  if (storedKey) {
    setClientApiKey(storedKey);
    maskKeyInput(storedKey);
    setStatus(elements.keyStatus, 'Stored API key loaded from localStorage.', 'success');
  } else {
    setStatus(elements.keyStatus, 'Enter your Google Generative AI key to begin.');
  }
}

function wireEvents() {
  elements.keyForm?.addEventListener('submit', handleKeySubmit);
  elements.keyClear?.addEventListener('click', handleKeyClear);
  elements.chatForm?.addEventListener('submit', handleChatSubmit);
  elements.knowledgeForm?.addEventListener('submit', handleKnowledgeSubmit);
}

function guardFetchAvailability() {
  if (typeof fetch !== 'function') {
    setStatus(elements.keyStatus, 'Fetch API is unavailable in this environment.', 'error');
    const disabledControls = [
      elements.keyInput,
      elements.chatInput,
      elements.chatKnowledge,
      elements.knowledgeQuery,
      elements.knowledgeContext
    ];

    disabledControls.forEach((control) => {
      if (!control) return;
      control.setAttribute('disabled', 'true');
    });

    document.querySelectorAll('button').forEach((button) => {
      button.setAttribute('disabled', 'true');
    });
  }
}

function init() {
  guardFetchAvailability();
  initialiseFromStorage();
  wireEvents();
}

init();
