# Storage System Test Guide

This document outlines how to test the storage implementation.

## Browser Console Tests

Open the app in a browser and run these commands in the browser console:

### Test 1: Initialize Storage
```javascript
await Storage.initialize();
console.log('Storage initialized');
```

Expected output: "Storage initialized" (or warning if IndexedDB unavailable, with fallback)

### Test 2: Create Conversation
```javascript
const convId = await Storage.startConversation('Test Conversation');
console.log('Conversation created with ID:', convId);
```

Expected output: Conversation ID (number or string)

### Test 3: Add Messages
```javascript
// User message
await Storage.addMessage(convId, {
  role: 'user',
  content: 'Hello, how are you?'
});

// Assistant message
await Storage.addMessage(convId, {
  role: 'assistant',
  content: 'I am doing well, thank you for asking!'
});

console.log('Messages added');
```

Expected output: "Messages added"

### Test 4: Fetch Conversation
```javascript
const conversation = await Storage.fetchConversation(convId);
console.log('Full conversation:', conversation);
console.log('Number of messages:', conversation.messages.length);
```

Expected output: Conversation object with 2 messages

### Test 5: Fetch All Conversations
```javascript
const allConversations = await Storage.fetchAllConversations();
console.log('All conversations:', allConversations);
```

Expected output: Array with at least one conversation

### Test 6: localStorage Operations
```javascript
// Save preferences
Storage.savePreferences({ theme: 'dark', language: 'en' });

// Load preferences
const prefs = Storage.loadPreferences();
console.log('Preferences:', prefs);
```

Expected output: `{ theme: 'dark', language: 'en' }`

### Test 7: API Key Storage
```javascript
// Save API key (session-only)
Storage.saveApiKey('test-api-key-123', true);

// Load API key
const key = Storage.loadApiKey();
console.log('API Key loaded:', key);
```

Expected output: `test-api-key-123`

### Test 8: User Profile
```javascript
// Save profile
Storage.saveUserProfile({ name: 'John Doe', email: 'john@example.com' });

// Load profile
const profile = Storage.loadUserProfile();
console.log('User profile:', profile);
```

Expected output: Profile object with name and email

### Test 9: Export Data
```javascript
const snapshot = await Storage.exportDataSnapshot();
console.log('Data snapshot:', snapshot);
console.log('Conversations in export:', snapshot.data.conversations.length);
```

Expected output: Snapshot with version, exportDate, and data containing conversations

### Test 10: Persistence Across Reloads
1. Run tests 1-4 above
2. Reload the page (F5)
3. Run this:
```javascript
const allConversations = await Storage.fetchAllConversations();
console.log('Conversations after reload:', allConversations);
```

Expected: Data persists - same conversation and messages appear

### Test 11: Clear History
```javascript
await Storage.clearAllConversations();
const allConversations = await Storage.fetchAllConversations();
console.log('Conversations after clear:', allConversations);
```

Expected output: Empty array `[]`

### Test 12: Full App Test
1. Open index.html in browser
2. Check console for initialization messages
3. Type a message in the chat input
4. Click "Send" or press Enter
5. Message should appear in chat
6. Reload page
7. Message should still be there

Expected: Chat UI works, messages persist

## Browser DevTools Inspection

### Verify IndexedDB
1. Open DevTools (F12)
2. Go to "Application" tab
3. Left sidebar → "IndexedDB"
4. Expand "SJAssistant" database
5. Verify two stores: "conversations" and "sessions"
6. Click "conversations" to view stored data

Expected: See conversation data with messages

### Verify localStorage
1. Open DevTools (F12)
2. Go to "Application" tab
3. Left sidebar → "Local Storage"
4. Click the domain
5. Verify keys: "userPreferences", "geminiApiKey", "userProfile"

Expected: See stored values from tests

## Troubleshooting

### IndexedDB not working?
- The system falls back to in-memory storage
- Check console for error messages
- Verify IndexedDB is not disabled in browser
- Try in private window (may have limited storage)

### localStorage not working?
- Check browser privacy settings
- localStorage may be disabled in private mode
- System continues to work with in-memory storage only

### Messages not persisting?
- Verify IndexedDB is working (DevTools inspection)
- Check browser console for errors
- Verify storage quota not exceeded
- Try clearing browser cache

## Performance Notes

- Initial storage initialization is async (happens on first storage operation)
- All operations are non-blocking (async/await)
- IndexedDB queries are indexed for efficiency
- Export/import handles large datasets

## Expected Acceptance Criteria ✓

- [x] App initializes storage without errors
- [x] Can persist dummy data via console
- [x] Data persists across reloads
- [x] localStorage handles preferences, API key, profile
- [x] IndexedDB handles conversations with messages and timestamps
- [x] Export/import functionality works
- [x] Clear history functionality works
- [x] Error handling with fallback to in-memory storage
- [x] Comprehensive code documentation
- [x] Ready for higher layer integration
