import {
  loadConversations,
  saveConversations,
  loadPreferences,
  savePreferences,
  loadApiKey,
  saveApiKey,
  clearApiKey,
  clearConversations,
  clearPreferences,
} from "./storage.js";
import { generateSuggestions } from "./suggestions.js";
import { aiClient } from "./aiClient.js";

let conversations = [];
let preferences = {};
let knowledgeAbortController = null;

const chatLogEl = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const suggestionsContainer = document.getElementById("suggestions-container");
const refreshSuggestionsBtn = document.getElementById("refresh-suggestions");
const knowledgeForm = document.getElementById("knowledge-form");
const knowledgeQueryInput = document.getElementById("knowledge-query");
const knowledgeResults = document.getElementById("knowledge-results");
const exportDataBtn = document.getElementById("export-data");
const clearHistoryBtn = document.getElementById("clear-history");
const clearPreferencesBtn = document.getElementById("clear-preferences");
const themeToggle = document.getElementById("theme-toggle");
const apiKeyForm = document.getElementById("api-key-form");
const apiKeyInput = document.getElementById("api-key-input");
const resetApiKeyBtn = document.getElementById("reset-api-key");

const messageTemplate = document.getElementById("message-template");
const suggestionTemplate = document.getElementById("suggestion-template");
const knowledgeTemplate = document.getElementById("knowledge-result-template");

function createIdentifier() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTimestamp(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(value));
  } catch (error) {
    return "";
  }
}

function renderMessage(message) {
  const node = messageTemplate.content.cloneNode(true);
  const container = node.querySelector(".message");
  const roleEl = node.querySelector(".message-role");
  const timeEl = node.querySelector(".message-time");
  const textEl = node.querySelector(".message-text");

  container.dataset.role = message.role;
  roleEl.textContent = message.role === "assistant" ? "Assistant" : "You";
  timeEl.textContent = formatTimestamp(message.timestamp);
  textEl.textContent = message.text;

  return node;
}

function renderChatLog() {
  chatLogEl.innerHTML = "";
  conversations.forEach((message) => {
    chatLogEl.appendChild(renderMessage(message));
  });
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function renderSuggestions() {
  const suggestions = generateSuggestions(conversations, preferences);

  suggestionsContainer.innerHTML = "";

  if (!suggestions.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent =
      "Start a conversation to receive personalised suggestions.";
    suggestionsContainer.appendChild(emptyState);
    return;
  }

  suggestions.forEach((item) => {
    const node = suggestionTemplate.content.cloneNode(true);
    node.querySelector(".suggestion-title").textContent = item.title;
    node.querySelector(".suggestion-body").textContent = item.body;
    suggestionsContainer.appendChild(node);
  });
}

function renderKnowledgeResults(results, query) {
  knowledgeResults.innerHTML = "";

  if (!query) {
    const prompt = document.createElement("p");
    prompt.className = "empty-state";
    prompt.textContent = "Run a search to explore the knowledge base.";
    knowledgeResults.appendChild(prompt);
    return;
  }

  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = `No matches found for “${query}”. Try a broader keyword.`;
    knowledgeResults.appendChild(empty);
    return;
  }

  results.forEach((item) => {
    const node = knowledgeTemplate.content.cloneNode(true);
    node.querySelector(".knowledge-title").textContent = item.title;
    node.querySelector(".knowledge-snippet").textContent = item.snippet;
    knowledgeResults.appendChild(node);
  });
}

function updateTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

function storeMessage(role, text) {
  const entry = {
    id: createIdentifier(),
    role,
    text,
    timestamp: new Date().toISOString(),
  };

  conversations = [...conversations, entry];
  saveConversations(conversations);
  return entry;
}

function generateAssistantReply(userMessage) {
  const followUp = `I understand you're focusing on "${userMessage}". Would you like to explore related strategies or search the knowledge base?`;
  return followUp;
}

function handleChatSubmit(event) {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  storeMessage("user", message);
  renderChatLog();

  // Simulated assistant reply to keep the conversation flowing
  const assistantReply = generateAssistantReply(message);
  storeMessage("assistant", assistantReply);
  renderChatLog();

  chatInput.value = "";
  refreshSuggestions();
}

async function handleKnowledgeSearch(event) {
  event.preventDefault();
  const query = knowledgeQueryInput.value.trim();
  knowledgeQueryInput.disabled = true;
  knowledgeForm.querySelector("button[type=submit]").disabled = true;

  if (knowledgeAbortController) {
    knowledgeAbortController.abort();
  }
  knowledgeAbortController = new AbortController();
  const signal = knowledgeAbortController.signal;

  try {
    if (!query) {
      renderKnowledgeResults([], query);
      return;
    }

    knowledgeResults.innerHTML = "";
    const searching = document.createElement("p");
    searching.className = "empty-state";
    searching.textContent = `Searching for “${query}”…`;
    knowledgeResults.appendChild(searching);

    const results = await aiClient.search(query);
    if (signal.aborted) return;
    renderKnowledgeResults(results, query);
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    knowledgeResults.innerHTML = "";
    const errorEl = document.createElement("p");
    errorEl.className = "error";
    errorEl.textContent = "Something went wrong. Please try again.";
    knowledgeResults.appendChild(errorEl);
  } finally {
    knowledgeQueryInput.disabled = false;
    knowledgeForm.querySelector("button[type=submit]").disabled = false;
  }
}

function exportUserData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    conversations,
    preferences,
    apiKeyPresent: Boolean(loadApiKey()),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sj-assistant-export-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function confirmAction(message) {
  return window.confirm(message);
}

function refreshSuggestions() {
  renderSuggestions();
}

function initThemeToggle() {
  const isDark = preferences.theme === "dark";
  themeToggle.checked = isDark;
  updateTheme(preferences.theme);

  if (!themeToggle.dataset.initialised) {
    themeToggle.addEventListener("change", () => {
      preferences = {
        ...preferences,
        theme: themeToggle.checked ? "dark" : "light",
      };
      updateTheme(preferences.theme);
      savePreferences(preferences);
      refreshSuggestions();
    });
    themeToggle.dataset.initialised = "true";
  }
}

function initApiKey() {
  apiKeyInput.value = loadApiKey();

  apiKeyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = apiKeyInput.value.trim();
    if (value) {
      saveApiKey(value);
    }
    apiKeyInput.blur();
  });

  resetApiKeyBtn.addEventListener("click", () => {
    if (!confirmAction("Reset stored API key?")) return;
    clearApiKey();
    apiKeyInput.value = "";
  });
}

function initDataManagement() {
  exportDataBtn.addEventListener("click", exportUserData);

  clearHistoryBtn.addEventListener("click", () => {
    if (!confirmAction("Clear the entire conversation history?")) return;
    clearConversations();
    conversations = [];
    renderChatLog();
    refreshSuggestions();
  });

  clearPreferencesBtn.addEventListener("click", () => {
    if (!confirmAction("Reset your saved preferences?")) return;
    clearPreferences();
    preferences = loadPreferences();
    initThemeToggle();
    refreshSuggestions();
  });
}

function initEventHandlers() {
  chatForm.addEventListener("submit", handleChatSubmit);
  refreshSuggestionsBtn.addEventListener("click", refreshSuggestions);
  knowledgeForm.addEventListener("submit", handleKnowledgeSearch);
}

function restoreState() {
  conversations = loadConversations();
  preferences = loadPreferences();

  renderChatLog();
  renderKnowledgeResults([], "");
  refreshSuggestions();
}

function init() {
  restoreState();
  initThemeToggle();
  initApiKey();
  initDataManagement();
  initEventHandlers();
}

init();
