# SJ Assistant

AI-powered chat application with knowledge search and suggestions.

## Features

- **Chat Interface**: Real-time messaging with auto-scrolling and auto-resizing input
- **Storage Layer**: Comprehensive local storage with IndexedDB support
- **Data Management**: Export/import chat history and preferences
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: ARIA labels and semantic HTML for screen reader support

## Storage Architecture

### Overview

The storage system handles persistence of chat history and user preferences using a dual-layer approach:

- **localStorage**: Lightweight storage for preferences, API keys, and user profiles
- **IndexedDB**: Robust storage for conversation transcripts and message history

The system includes automatic fallback to in-memory storage if IndexedDB is unavailable.

### Storage Initialization

The storage system is initialized automatically on app bootstrap:

```javascript
// Called in App.init()
await Storage.initialize();
```

This:
1. Opens IndexedDB with proper versioning
2. Creates necessary stores (conversations, sessions)
3. Sets up indexes for efficient querying
4. Falls back to in-memory storage if IndexedDB fails

### localStorage

Stores lightweight, frequently-accessed data:

| Key | Content | Size | Persistence |
|-----|---------|------|-------------|
| `userPreferences` | User settings (theme, language, etc.) | Small | Permanent |
| `geminiApiKey` | AI API key | Small | Can use sessionStorage for security |
| `userProfile` | User info (name, email, avatar) | Small | Permanent |

#### Usage

```javascript
// Save preferences
Storage.savePreferences({ theme: 'dark', language: 'en' });

// Load preferences
const prefs = Storage.loadPreferences(); // Returns object or empty {}

// Save/load API key
Storage.saveApiKey('your-api-key');
Storage.saveApiKey('your-api-key', true); // Use sessionStorage for session-only storage
const key = Storage.loadApiKey();

// Save/load user profile
Storage.saveUserProfile({ name: 'John', email: 'john@example.com' });
const profile = Storage.loadUserProfile();

// Clear all localStorage data
Storage.clearLocalStorage();
```

### IndexedDB Schema

#### Database Details

- **Name**: `SJAssistant`
- **Version**: 1 (incrementable for migrations)
- **Version History**: See [Migrations](#migrations) section

#### Object Stores

##### `conversations` Store

Stores complete conversation transcripts:

```javascript
{
  id: 1,                           // Auto-incremented primary key
  title: "Conversation 2025-11-10", // Conversation title
  messages: [                       // Array of messages
    {
      id: "msg_123456_abc",         // Unique message ID
      role: "user",                 // "user" or "assistant"
      content: "Hello",             // Message text
      timestamp: 1699629600000      // Milliseconds since epoch
    },
    // ... more messages
  ],
  timestamp: 1699629600000,         // Initial creation time
  createdAt: "2025-11-10T...",      // ISO date string
  updatedAt: "2025-11-10T..."       // Last update time
}
```

**Indexes**:
- `timestamp`: For chronological retrieval

##### `sessions` Store

Reserved for session metadata and advanced user profile data (future use):

```javascript
{
  id: "session_user_001",           // Unique session ID
  userId: "user_001",               // Associated user
  deviceId: "device_xyz",           // Device identifier
  createdAt: "2025-11-10T...",      // Creation timestamp
  updatedAt: "2025-11-10T..."       // Last update timestamp
  // ... additional session data
}
```

**Indexes**:
- `createdAt`: For chronological retrieval

### Async API Reference

#### Conversation Operations

```javascript
// Start a new conversation
const conversationId = await Storage.startConversation(title);

// Add message to conversation
await Storage.addMessage(conversationId, {
  role: 'user',
  content: 'Hello, how are you?'
  // timestamp: auto-generated if not provided
});

// Fetch a specific conversation
const conversation = await Storage.fetchConversation(conversationId);
// Returns: { id, title, messages, timestamp, createdAt, updatedAt }

// Fetch all conversations (summary view)
const conversations = await Storage.fetchAllConversations();
// Returns: [{ id, title, timestamp, messageCount, createdAt, updatedAt }, ...]

// Delete a conversation
await Storage.deleteConversation(conversationId);

// Clear all conversations
await Storage.clearAllConversations();
```

#### Data Export/Import

```javascript
// Export all data as snapshot
const snapshot = await Storage.exportDataSnapshot();
// Returns: { version, exportDate, data: { conversations, preferences, profile } }

// Export as JSON string (for downloading)
const jsonString = await Storage.exportDataAsJson();

// Import from snapshot object or JSON string
const success = await Storage.importDataSnapshot(jsonStringOrObject);
```

### Error Handling & Fallbacks

The storage system includes comprehensive error handling:

1. **IndexedDB Failure**: All operations fall back to in-memory storage
2. **localStorage Failure**: Operations return false, warning logged
3. **Quota Exceeded**: Automatic fallback to in-memory storage
4. **Invalid Data**: Parse errors caught and logged, appropriate defaults returned

#### Example Error Handling

```javascript
try {
  const conversation = await Storage.fetchConversation(id);
  if (!conversation) {
    console.warn('Conversation not found');
  }
} catch (error) {
  console.error('Failed to fetch conversation:', error);
  // System automatically falls back to fallback storage
}
```

### Migrations

Version handling allows the schema to evolve:

- **Current Version**: 1
- **Auto-upgrade**: IndexedDB automatically calls `onupgradeneeded` when version changes

#### Adding a New Schema Version

Edit `js/storage.js`, `_createSchema()` method:

```javascript
_createSchema(db, oldVersion) {
  if (oldVersion < 1) {
    // Version 1 schema
  }
  
  if (oldVersion < 2) {
    // Version 2 schema - new stores or indexes
    const store = db.objectStoreNames.contains('newStore') 
      ? db.transaction('newStore', 'readwrite').objectStore('newStore')
      : db.createObjectStore('newStore', { keyPath: 'id' });
  }
}
```

Then increment `DB_VERSION = 2`.

### Console Testing

Test the storage system from browser console:

```javascript
// Initialize storage
await Storage.initialize();

// Create a conversation
const id = await Storage.startConversation('Test Chat');
console.log('Conversation ID:', id);

// Add some messages
await Storage.addMessage(id, {
  role: 'user',
  content: 'Hello, this is a test message'
});

await Storage.addMessage(id, {
  role: 'assistant',
  content: 'This is an assistant response'
});

// Fetch and verify
const conversation = await Storage.fetchConversation(id);
console.log('Conversation:', conversation);

// Save preferences
Storage.savePreferences({ theme: 'dark' });
console.log('Preferences:', Storage.loadPreferences());

// Export all data
const data = await Storage.exportDataSnapshot();
console.log('Data snapshot:', data);
```

### Performance Considerations

1. **Lazy Initialization**: Storage initializes on first use, not on page load
2. **Indexed Queries**: Conversations sorted by timestamp index
3. **Batch Operations**: Import operations process multiple records efficiently
4. **Memory Fallback**: In-memory storage suitable for small datasets and fallback scenarios

### Browser Compatibility

- **IndexedDB**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **localStorage**: All modern browsers
- **Fallback**: Works in private/incognito mode (in-memory only)

### API Key Security

The API key can be stored in two ways:

```javascript
// Permanent storage (persists across sessions)
Storage.saveApiKey(apiKey, false); // or false explicitly

// Session-only storage (cleared on browser close - more secure)
Storage.saveApiKey(apiKey, true);

// Automatic retrieval (checks session first, then localStorage)
const key = Storage.loadApiKey();
```

For production:
1. Use sessionStorage (pass `true` to `saveApiKey`)
2. Never expose API keys in client code
3. Consider backend API proxy for security

### Code Examples

#### Complete Flow: User Sends Message

```javascript
// 1. Initialize storage on app load
await Storage.initialize();

// 2. Start new conversation
const convId = await Storage.startConversation('Chat Session');

// 3. Add user message
await Storage.addMessage(convId, {
  role: 'user',
  content: 'What is machine learning?'
});

// 4. Add AI response (simulated)
await Storage.addMessage(convId, {
  role: 'assistant',
  content: 'Machine learning is a subset of AI...'
});

// 5. Fetch complete conversation
const full = await Storage.fetchConversation(convId);
console.log(`Conversation has ${full.messages.length} messages`);

// 6. Persist user preferences
Storage.savePreferences({ lastConversation: convId });

// 7. Export for backup
const backup = await Storage.exportDataAsJson();
// User can download this as JSON file
```

## Quick Start

### Development

1. Open `index.html` in a modern browser
2. Open browser console
3. Storage system auto-initializes on app load
4. Test with console commands from [Console Testing](#console-testing) section

### Testing Persistence

1. Open app in browser
2. Open browser DevTools (F12)
3. Go to Applications → Storage
4. Verify in IndexedDB: `SJAssistant` database with stores
5. Verify in Local Storage: app-specific keys
6. Reload page - data persists
7. Use export/import for backup

## Future Enhancements

- [ ] Full-text search on conversation content
- [ ] Encrypted storage for sensitive data
- [ ] Sync across devices with backend
- [ ] Compression for large conversation histories
- [ ] Scheduled backups
- [ ] User authentication and server-side storage
