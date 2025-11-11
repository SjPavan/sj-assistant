const DEFAULT_HISTORY_LIMIT = 16;

const ROLE_MAP = {
  user: 'user',
  model: 'model',
  assistant: 'model',
  system: 'system'
};

function normalizeParts(parts) {
  if (!parts) {
    return [];
  }

  if (Array.isArray(parts)) {
    return parts
      .filter(Boolean)
      .map((part) => (typeof part === 'string' ? { text: part } : part))
      .filter(Boolean);
  }

  if (typeof parts === 'string') {
    return [{ text: parts }];
  }

  if (typeof parts === 'object' && 'text' in parts) {
    return [parts];
  }

  return [];
}

function normalizeHistory(history, limit = DEFAULT_HISTORY_LIMIT) {
  if (!Array.isArray(history)) {
    return [];
  }

  const mapped = history
    .map((entry) => ({
      role: ROLE_MAP[entry.role] ?? 'user',
      parts: normalizeParts(entry.parts ?? entry.content ?? entry.text)
    }))
    .filter((entry) => entry.parts.length > 0 && entry.role !== 'system');

  if (mapped.length <= limit) {
    return mapped;
  }

  return mapped.slice(mapped.length - limit);
}

function buildUserPromptParts(prompt, knowledgeContext) {
  const parts = [];

  const knowledge = formatKnowledgeContext(knowledgeContext);

  if (knowledge) {
    parts.push({
      text: `Utilize the following reference knowledge when relevant. Treat it as potentially incomplete and verify with general reasoning.\n\n${knowledge}\n\n--- End of knowledge context ---`
    });
  }

  if (prompt && prompt.trim().length) {
    parts.push({ text: prompt.trim() });
  }

  return parts;
}

function formatKnowledgeContext(context) {
  if (!context) {
    return '';
  }

  const entries = Array.isArray(context) ? context : [context];

  const formatted = entries
    .filter(Boolean)
    .map((entry, index) => {
      if (typeof entry === 'string') {
        return `(${index + 1}) ${entry}`;
      }

      if (typeof entry === 'object') {
        const title = entry.title ? `${entry.title} – ` : '';
        const body = entry.snippet ?? entry.content ?? entry.text ?? '';
        return `(${index + 1}) ${title}${body}`.trim();
      }

      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  return formatted;
}

function buildBasePayload({
  prompt,
  history,
  knowledgeContext,
  systemInstruction,
  generationConfig,
  safetySettings,
  extras
}) {
  const contents = normalizeHistory(history);

  const userParts = buildUserPromptParts(prompt, knowledgeContext);

  if (userParts.length === 0) {
    throw new Error('A non-empty prompt or knowledge context is required to create a request.');
  }

  contents.push({ role: 'user', parts: userParts });

  const payload = { contents };

  if (systemInstruction) {
    payload.systemInstruction = {
      role: 'system',
      parts: normalizeParts(systemInstruction)
    };
  }

  if (generationConfig) {
    payload.generationConfig = generationConfig;
  }

  if (safetySettings) {
    payload.safetySettings = safetySettings;
  }

  if (extras) {
    Object.assign(payload, extras);
  }

  return payload;
}

export function buildChatPayload({
  prompt,
  history = [],
  knowledgeContext = [],
  systemInstruction,
  generationConfig,
  safetySettings,
  extras
} = {}) {
  return buildBasePayload({
    prompt,
    history,
    knowledgeContext,
    systemInstruction,
    generationConfig,
    safetySettings,
    extras
  });
}

export function buildKnowledgePayload({
  query,
  history = [],
  knowledgeContext = [],
  systemInstruction,
  generationConfig,
  safetySettings,
  retrievalConfig
} = {}) {
  const extras = {
    tools: [{ googleSearchRetrieval: {} }]
  };

  if (retrievalConfig) {
    extras.toolConfig = {
      googleSearchRetrieval: retrievalConfig
    };
  }

  return buildBasePayload({
    prompt: query,
    history,
    knowledgeContext,
    systemInstruction,
    generationConfig,
    safetySettings,
    extras
  });
}

export { formatKnowledgeContext };
