# SJ Assistant

A lightweight single-page assistant experience that demonstrates personalised
suggestions, knowledge retrieval, and data management capabilities.

## Getting started

Open `index.html` in a modern browser. All functionality runs locally in the
browser—no build tools or servers are required.

## Key features

- **Conversation tracking:** Capture user and assistant messages with a minimal
  chat interface. Conversations persist locally so you can pick up where you
  left off.
- **Personalised suggestions:** Context-aware prompts surface frequently
  discussed topics, helpful follow-ups, and productivity tips derived from your
  stored history and preferences. Refresh anytime for updated ideas.
- **Knowledge search:** Submit focused queries through the knowledge panel to
  reuse the assistant's search capability and display curated results distinct
  from the chat.
- **Data controls:** Export conversations and preferences to a downloadable JSON
  file, clear history or preferences with confirmation safeguards, and manage
  the stored API key.
- **Preferences:** Toggle between light and dark theme modes. Theme selections
  persist across sessions using `localStorage`.

All saved data lives in `localStorage`, so clearing browser data will remove the
stored conversations, preferences, and API key.
