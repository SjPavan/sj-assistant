# SJ Assistant

A lightweight, AI-powered chat application with knowledge search and intelligent suggestions. Built with vanilla JavaScript and modern CSS, no build tools required.

## Overview

SJ Assistant is a responsive web-based chat interface that integrates with Google's Gemini AI API to provide intelligent conversational capabilities. The application features a clean, accessible UI with a two-column desktop layout that adapts gracefully to mobile and tablet screens.

### Features

- **AI-Powered Chat**: Real-time conversation with Gemini AI
- **Responsive Design**: Seamlessly adapts from desktop to mobile devices
- **Knowledge Search Panel**: Search and retrieve information from your knowledge base
- **Smart Suggestions**: Context-aware suggestions for better conversations
- **Data Management**: Export, import, and clear chat history
- **Accessible Interface**: ARIA labels, semantic HTML, keyboard navigation
- **Local Storage**: Chat history persisted in browser storage
- **Dark Mode Support**: Automatic light/dark mode based on system preferences
- **No Build Tools**: Pure HTML, CSS, and JavaScript – just open in a browser

## Project Structure

```
├── index.html              # Main application file with UI and embedded CSS
├── js/
│   ├── app.js             # Main application logic and orchestration
│   ├── storage.js         # LocalStorage and data persistence utilities
│   ├── aiClient.js        # Gemini AI API integration
│   └── suggestions.js     # Suggestion generation and management
├── README.md              # This file
```

## Setup Instructions

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A Google Gemini API key (free tier available)

### Getting Started

1. **Clone or download the repository**

```bash
git clone <repository-url>
cd sj-assistant
```

2. **Obtain a Gemini API Key**

   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key
   - Keep this key secure and don't commit it to version control

3. **Configure the API Key**

   There are two ways to provide the API key:

   **Option A: Browser SessionStorage (Recommended for local use)**
   
   Open the browser console and run:
   ```javascript
   sessionStorage.setItem('geminiApiKey', 'your-api-key-here');
   ```

   **Option B: Browser LocalStorage (Persists across sessions)**
   
   Open the browser console and run:
   ```javascript
   localStorage.setItem('geminiApiKey', 'your-api-key-here');
   ```

   **Option C: Environment Variable (For development/deployment)**
   
   Set the environment variable before serving:
   ```bash
   export GEMINI_API_KEY=your-api-key-here
   ```

4. **Run the Application**

   Simply open `index.html` in your web browser:
   - Double-click the file, or
   - Use a local development server for better compatibility:

   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000

   # Using Node.js (if you have http-server installed)
   npx http-server
   ```

   Then navigate to `http://localhost:8000` in your browser.

### Security Note

**Never hardcode your API key in the HTML or JavaScript files.** Always use one of the configuration methods above. The API key is sensitive and should be kept private.

## Usage

### Chat Interface

1. **Send Messages**: Type your message in the input field and press Enter (or Shift+Enter for new line), or click the Send button
2. **View History**: All messages are displayed in the conversation area and automatically saved
3. **Clear History**: Use the "Clear History" button in the Data Management panel

### Knowledge Search

- Enter search terms in the "Knowledge Search" panel
- Results will be displayed as you type
- Click on any result to add it to your message

### Suggestions

- Suggestions appear based on your conversation context
- Click on any suggestion to insert it into the message input
- Suggestion format includes emoji icons for quick visual scanning

### Data Management

- **Export History**: Download your chat history as a JSON file
- **Import History**: Load a previously exported JSON file
- **Clear History**: Remove all chat history (warning: this cannot be undone)

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile (iOS) | Safari 14+ | ✅ Full |
| Mobile (Android) | Chrome 90+ | ✅ Full |

## Responsive Breakpoints

- **Desktop**: 1024px+ (two-column layout)
- **Tablet**: 768px - 1023px (adapted two-column)
- **Mobile**: Below 768px (single-column layout)

## Accessibility Features

- **Semantic HTML**: Uses `<header>`, `<main>`, `<section>`, `<aside>` landmarks
- **ARIA Labels**: All interactive elements have descriptive labels
- **Keyboard Navigation**: Full keyboard support for all controls
- **Skip Links**: "Skip to main content" link for keyboard users
- **Color Contrast**: Meeting WCAG AA standards
- **Focus Indicators**: Clear visual focus states
- **Live Regions**: Chat history updates announced to screen readers

## Architecture

### Modular Design

The application is organized into separate, independent modules:

- **`app.js`**: Main orchestrator - handles UI rendering, event delegation, and state management
- **`storage.js`**: Data persistence - handles localStorage operations for chat history and preferences
- **`aiClient.js`**: API communication - manages all interactions with Gemini AI
- **`suggestions.js`**: Suggestion engine - generates context-aware suggestions

Each module is self-contained and communicates through a simple interface, making it easy to modify, test, or replace individual components.

### State Management

Application state is managed through the `App.state` object:
- `messages`: Array of message objects with role, content, and timestamp
- `isLoading`: Boolean indicating if waiting for AI response
- `selectedSearchResult`: Currently selected search result

### CSS Organization

The stylesheet is organized into logical sections:
- CSS Variables and theme configuration
- Reset and base styles
- Layout structure
- Component styles
- Responsive breakpoints
- Accessibility features

## Development

### Adding New Features

1. **New Modules**: Create a new file in the `js/` directory following the existing pattern
2. **Module Communication**: Use a simple interface (object with methods) for module communication
3. **Event Handling**: Use event listeners for user interactions; consider event delegation for dynamic elements
4. **Storage**: Use the Storage module for any persistent data

### Styling New Components

1. Add CSS variables for new colors or spacing as needed
2. Follow the existing naming conventions
3. Ensure responsive design by including mobile breakpoint styles
4. Test color contrast for accessibility

### Testing in Browser

Use the browser's developer tools to:
- **Debug**: Chrome DevTools (F12) - inspect elements and debug JavaScript
- **Network**: Monitor API calls in the Network tab
- **Storage**: View localStorage/sessionStorage in the Application tab
- **Accessibility**: Run Lighthouse audit (Ctrl+Shift+I > Lighthouse)

## Future Enhancements

- Knowledge base integration
- Message history search
- User authentication
- Conversation themes
- Custom system prompts
- Message editing and deletion
- Voice input/output
- Markdown rendering for AI responses
- Code syntax highlighting
- Conversation bookmarking

## Troubleshooting

### "API key not configured" message

**Solution**: Set your API key using one of the methods described in the Setup Instructions above.

### Messages not saving

**Solution**: Check browser's localStorage settings. Some browsers may have localStorage disabled or cleared. Try using sessionStorage instead.

### Slow responses or timeouts

**Solution**: 
- Check your internet connection
- Verify your API key is valid
- Check Google's API status page
- Try a shorter, simpler message

### Styles not loading correctly

**Solution**:
- Clear browser cache (Ctrl+Shift+Delete)
- Try a different browser
- Ensure you're viewing the HTML file in a web server (not as file://)

### Mobile layout not responsive

**Solution**:
- Check that viewport meta tag is present (it is in our template)
- Clear browser cache
- Try zooming out (Ctrl+- or Cmd+-)
- Rotate device to test orientation changes

## Security and Privacy

- Chat history is stored locally in your browser
- No data is sent to any server except the Gemini API
- Your API key should never be exposed or committed to version control
- Use HTTPS when deploying to production
- Consider implementing rate limiting for production use

## License

[Add appropriate license here]

## Support

For issues, questions, or suggestions, please:
1. Check the Troubleshooting section above
2. Review the browser console for error messages (F12 > Console)
3. Create an issue in the repository

## Contributing

Contributions are welcome! Please:
1. Test thoroughly before submitting
2. Follow existing code style and conventions
3. Include clear commit messages
4. Test on multiple browsers and devices

## Credits

Built with vanilla JavaScript, CSS, and the Google Gemini API.
