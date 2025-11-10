# SJ Assistant

A web-based chat application with AI integration and persistent storage.

## Features

- **Real-time Chat**: Interactive chat interface with smooth animations
- **AI Integration**: Powered by OpenAI's GPT models
- **Persistent Storage**: Conversations are saved to IndexedDB and persist across browser sessions
- **Typing Indicators**: Visual feedback when AI is processing responses
- **Auto-scroll**: Chat automatically scrolls to the latest message
- **Message Timestamps**: Smart timestamp formatting (shows time for recent messages, date + time for older ones)
- **XSS Protection**: Messages are properly sanitized to prevent XSS attacks
- **Responsive Design**: Works on desktop and mobile devices
- **Session Management**: Automatically resumes the latest conversation or starts a new one

## Setup

1. Open `index.html` in your web browser
2. When prompted, enter your OpenAI API key
3. Start chatting!

## API Key Configuration

The application requires an OpenAI API key. You can:
- Enter it when prompted on first load
- Set it manually in browser console: `localStorage.setItem('openai_api_key', 'your-api-key-here')`

## Architecture

The application consists of four main modules:

### `storage.js`
- IndexedDB wrapper for persistent storage
- Manages conversations and messages
- Handles database schema and migrations

### `aiClient.js`
- OpenAI API integration
- Error handling and retry logic
- API key management

### `app.js`
- Main application logic
- UI event handling
- Message rendering and formatting
- Session management

### `index.html` + `styles.css`
- Modern, responsive chat interface
- Smooth animations and transitions
- Accessible design patterns

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Security Features

- XSS protection through proper HTML escaping
- Secure API key storage in localStorage
- Input validation and sanitization
- HTTPS required for production use

## Local Development

Simply open `index.html` in a web browser. No build process required.

For production deployment, ensure:
- HTTPS is enabled (required for IndexedDB in some browsers)
- OpenAI API key is properly secured
- CSP headers are configured if needed