const STORAGE_KEYS = {
  conversations: "sjAssistant.conversations",
  preferences: "sjAssistant.preferences",
  apiKey: "sjAssistant.apiKey",
};

const defaultPreferences = {
  theme: "light",
  suggestionsEnabled: true,
};

export function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.conversations);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((message) => ({
        ...message,
        timestamp: message.timestamp ?? new Date().toISOString(),
      }));
    }
  } catch (error) {
    console.warn("Failed to parse stored conversations", error);
  }
  return [];
}

export function saveConversations(messages) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.conversations,
      JSON.stringify(messages ?? [])
    );
  } catch (error) {
    console.error("Unable to persist conversations", error);
  }
}

export function clearConversations() {
  localStorage.removeItem(STORAGE_KEYS.conversations);
}

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.preferences);
    if (!raw) return { ...defaultPreferences };
    const parsed = JSON.parse(raw);
    return { ...defaultPreferences, ...parsed };
  } catch (error) {
    console.warn("Failed to parse stored preferences", error);
    return { ...defaultPreferences };
  }
}

export function savePreferences(prefs) {
  try {
    const sanitized = { ...defaultPreferences, ...prefs };
    localStorage.setItem(
      STORAGE_KEYS.preferences,
      JSON.stringify(sanitized)
    );
  } catch (error) {
    console.error("Unable to persist preferences", error);
  }
}

export function clearPreferences() {
  localStorage.removeItem(STORAGE_KEYS.preferences);
}

export function loadApiKey() {
  return localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
}

export function saveApiKey(key) {
  if (typeof key === "string") {
    localStorage.setItem(STORAGE_KEYS.apiKey, key);
  }
}

export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEYS.apiKey);
}
