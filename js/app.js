/**
 * Main Application Module
 * Orchestrates the SJ Assistant application
 * Initializes storage system on bootstrap
 */
const App = {
  // Configuration
  config: {
    apiKey: null,
    theme: 'auto',
    currentConversationId: null
  },

  // State
  state: {
    messages: [],
    conversations: [],
    isLoading: false,
    selectedSearchResult: null
  },

  /**
   * Initialize the application
   * Called on DOM ready - handles storage initialization and bootstrap
   */
  async init() {
    console.log('Initializing SJ Assistant...');
    
    try {
      // Step 1: Initialize storage system
      // This sets up IndexedDB with proper schema and fallback mechanisms
      await Storage.initialize();
      console.log('Storage system initialized');

      // Step 2: Load stored preferences from localStorage
      const preferences = Storage.loadPreferences();
      if (preferences.theme) {
        this.config.theme = preferences.theme;
      }
      console.log('User preferences loaded:', preferences);

      // Step 3: Load user profile from localStorage
      const userProfile = Storage.loadUserProfile();
      console.log('User profile loaded:', userProfile);

      // Step 4: Load API key from storage (session or local)
      this.config.apiKey = Storage.loadApiKey();
      if (this.config.apiKey) {
        console.log('API key loaded from storage');
      } else {
        console.warn('No API key found in storage - AI features will be unavailable');
      }

      // Step 5: Load conversation history from IndexedDB
      // This is async and will use fallback storage if IndexedDB fails
      const conversations = await Storage.fetchAllConversations();
      this.state.conversations = conversations;
      console.log(`Loaded ${conversations.length} conversations from storage`);

      // Step 6: Load the most recent conversation if available
      if (conversations.length > 0) {
        // Find the most recently updated conversation
        const mostRecent = conversations.reduce((prev, current) =>
          new Date(current.updatedAt) > new Date(prev.updatedAt) ? current : prev
        );
        this.state.currentConversationId = mostRecent.id;
        
        const conversation = await Storage.fetchConversation(mostRecent.id);
        if (conversation) {
          this.state.messages = conversation.messages || [];
          console.log(`Loaded ${this.state.messages.length} messages from conversation ${mostRecent.id}`);
        }
      }

      // Step 7: Initialize AI client if API key is available
      if (this.config.apiKey && typeof AIClient !== 'undefined') {
        AIClient.initialize(this.config.apiKey);
        console.log('AI Client initialized');
      }

      // Step 8: Set up event listeners
      this._setupEventListeners();

      // Step 9: Render initial UI
      this._render();

      console.log('SJ Assistant initialized successfully');
    } catch (error) {
      console.error('Error during app initialization:', error);
      this._showError('Failed to initialize application');
    }
  },

  /**
   * Get API key from multiple sources (for backward compatibility)
   * @private
   * @returns {string|null} API key or null if not found
   */
  _getApiKey() {
    // Check environment variable (for development)
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }

    // Check sessionStorage
    const sessionKey = sessionStorage.getItem('geminiApiKey');
    if (sessionKey) {
      return sessionKey;
    }

    // Check localStorage
    const storageKey = localStorage.getItem('geminiApiKey');
    if (storageKey) {
      return storageKey;
    }

    return null;
  },

  /**
   * Set up all event listeners
   * @private
   */
  _setupEventListeners() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const clearButton = document.getElementById('clear-button');

    // Chat input
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Auto-resize textarea
      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
      });
    }

    // Send button
    if (sendButton) {
      sendButton.addEventListener('click', () => this.sendMessage());
    }

    // Export button
    if (exportButton) {
      exportButton.addEventListener('click', () => this.exportData());
    }

    // Import button
    if (importButton) {
      importButton.addEventListener('click', () => this.importData());
    }

    // Clear button
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearData());
    }

    // Suggestion buttons
    const suggestionsList = document.getElementById('suggestions-list');
    if (suggestionsList) {
      suggestionsList.querySelectorAll('.suggestion-item').forEach(button => {
        button.addEventListener('click', (e) => {
          const text = e.target.textContent.trim();
          this._insertSuggestionText(text);
        });
      });
    }
  },

  /**
   * Send a message
   * Creates new conversation if needed and persists to storage
   */
  async sendMessage() {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput || !chatInput.value.trim()) {
      return;
    }

    const messageText = chatInput.value.trim();
    chatInput.value = '';
    chatInput.style.height = 'auto';

    try {
      // Create new conversation if needed
      if (!this.state.currentConversationId) {
        this.state.currentConversationId = await Storage.startConversation(
          `Conversation ${new Date().toLocaleString()}`
        );
        console.log('Created new conversation:', this.state.currentConversationId);
      }

      // Add user message to storage
      const userMessage = {
        role: 'user',
        content: messageText,
        timestamp: Date.now()
      };

      await Storage.addMessage(this.state.currentConversationId, userMessage);
      this.state.messages.push(userMessage);

      // Render the new message
      this._render();

      // TODO: Send to AI client and get response
      // For now, just show a placeholder
      setTimeout(() => {
        const assistantMessage = {
          role: 'assistant',
          content: '(Storage working! Message persisted. AI integration coming soon.)',
          timestamp: Date.now()
        };
        this.state.messages.push(assistantMessage);
        Storage.addMessage(this.state.currentConversationId, assistantMessage);
        this._render();
      }, 500);
    } catch (error) {
      console.error('Error sending message:', error);
      this._showError('Failed to send message');
    }
  },

  /**
   * Export chat history as JSON file
   */
  async exportData() {
    try {
      const jsonData = await Storage.exportDataAsJson();
      
      // Create blob and download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sj-assistant-export-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Data exported successfully');
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      this._showError('Failed to export data');
    }
  },

  /**
   * Import chat history from JSON file
   */
  async importData() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const jsonContent = event.target.result;
            const success = await Storage.importDataSnapshot(jsonContent);
            
            if (success) {
              alert('Data imported successfully! Refreshing page...');
              window.location.reload();
            } else {
              alert('Failed to import data. Please check the file format.');
            }
          } catch (error) {
            console.error('Error reading import file:', error);
            alert('Error reading file. Please ensure it\'s a valid export file.');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (error) {
      console.error('Error initiating import:', error);
      this._showError('Failed to start import');
    }
  },

  /**
   * Clear all chat history after confirmation
   */
  async clearData() {
    if (!confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      return;
    }

    try {
      await Storage.clearAllConversations();
      this.state.messages = [];
      this.state.conversations = [];
      this.state.currentConversationId = null;
      this._render();
      console.log('All data cleared');
      alert('Chat history cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      this._showError('Failed to clear data');
    }
  },

  /**
   * Render the UI
   * @private
   */
  _render() {
    this._renderChatHistory();
    this._updateSuggestions();
  },

  /**
   * Render chat history
   * @private
   */
  _renderChatHistory() {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;

    chatHistory.innerHTML = this.state.messages
      .map(message => `
        <div class="message ${message.role}">
          <div class="message-content">
            ${this._escapeHtml(message.content)}
          </div>
        </div>
      `)
      .join('');

    this._scrollChatToBottom();
  },

  /**
   * Update suggestions display
   * @private
   */
  _updateSuggestions() {
    const suggestionsList = document.getElementById('suggestions-list');
    if (!suggestionsList) return;

    const suggestions = [
      '💡 Load sample conversation',
      '🔍 Ask a sample question',
      '⚙️ Show system info'
    ];

    suggestionsList.innerHTML = suggestions
      .map(suggestion => `
        <button class="suggestion-item" type="button">${this._escapeHtml(suggestion)}</button>
      `)
      .join('');

    // Reattach event listeners
    suggestionsList.querySelectorAll('.suggestion-item').forEach(button => {
      button.addEventListener('click', (e) => {
        const text = e.target.textContent.replace(/^[^\s]+\s/, '');
        this._insertSuggestionText(text);
      });
    });
  },

  /**
   * Insert suggestion text into input
   * @private
   * @param {string} text - Text to insert
   */
  _insertSuggestionText(text) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = text;
      chatInput.focus();
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    }
  },

  /**
   * Scroll chat to bottom
   * @private
   */
  _scrollChatToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      setTimeout(() => {
        chatHistory.scrollTop = chatHistory.scrollHeight;
      }, 0);
    }
  },

  /**
   * Show error message in chat
   * @private
   * @param {string} message - Error message
   */
  _showError(message) {
    console.error(message);
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        padding: var(--spacing-md);
        background-color: rgba(220, 38, 38, 0.1);
        border: 1px solid var(--error-color);
        border-radius: 0.375rem;
        color: var(--error-color);
        margin: var(--spacing-md) 0;
      `;
      errorDiv.textContent = `⚠️ ${message}`;
      chatHistory.appendChild(errorDiv);
      this._scrollChatToBottom();
    }
  },

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  _escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
