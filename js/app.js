/**
 * Main Application Module
 * Orchestrates the SJ Assistant application
 */

const App = {
    // Configuration
    config: {
        apiKey: null,
        theme: 'auto'
    },

    // State
    state: {
        messages: [],
        isLoading: false,
        selectedSearchResult: null
    },

    /**
     * Initialize the application
     */
    init() {
        console.log('Initializing SJ Assistant...');

        // Load API key from environment or storage
        this.config.apiKey = this._getApiKey();

        // Load persisted state
        this.state.messages = Storage.loadChatHistory();

        // Initialize AI client if API key is available
        if (this.config.apiKey) {
            AIClient.initialize(this.config.apiKey);
        }

        // Set up event listeners
        this._setupEventListeners();

        // Render initial UI
        this._render();

        console.log('SJ Assistant initialized successfully');
    },

    /**
     * Get API key from multiple sources
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
        const searchInput = document.getElementById('search-input');
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

        // Search input
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }

        // Data management buttons
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportChatHistory());
        }

        if (importButton) {
            importButton.addEventListener('click', () => this.showImportDialog());
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearChatHistory());
        }

        // Suggestion items
        document.querySelectorAll('.suggestion-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const text = e.target.textContent.replace(/^[^\s]+\s/, '');
                this._insertSuggestionText(text);
            });
        });
    },

    /**
     * Send a message
     */
    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput ? chatInput.value.trim() : '';

        if (!message) {
            return;
        }

        // Check if API key is configured
        if (!this.config.apiKey) {
            this._showError('API key not configured. Please set GEMINI_API_KEY in environment or localStorage.');
            return;
        }

        // Add user message to state and clear input
        this.state.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }

        // Save to storage
        Storage.saveChatHistory(this.state.messages);

        // Update UI
        this._render();

        // Set loading state
        this.state.isLoading = true;
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.disabled = true;
        }

        try {
            // Get AI response
            const response = await AIClient.sendMessage(message, this.state.messages.slice(0, -1));

            // Add AI response to state
            this.state.messages.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            });

            // Save to storage
            Storage.saveChatHistory(this.state.messages);

            // Update UI
            this._render();

            // Scroll to bottom
            this._scrollChatToBottom();
        } catch (error) {
            this._showError(`Failed to get AI response: ${error.message}`);
            console.error('Error:', error);

            // Remove the user message if AI failed
            this.state.messages.pop();
            Storage.saveChatHistory(this.state.messages);
            this._render();
        } finally {
            this.state.isLoading = false;
            if (sendButton) {
                sendButton.disabled = false;
            }
        }
    },

    /**
     * Perform search in knowledge base
     * @param {string} query - Search query
     */
    async performSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        if (!query || query.trim().length === 0) {
            resultsContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: var(--font-size-sm); padding: 0 var(--spacing-md);">Results will appear here</p>';
            return;
        }

        // TODO: Implement actual knowledge base search
        // For now, show a placeholder
        resultsContainer.innerHTML = `
            <div class="search-result-item">
                <h4>Sample Result</h4>
                <p>Search functionality will be implemented with knowledge base integration</p>
            </div>
        `;
    },

    /**
     * Export chat history
     */
    exportChatHistory() {
        const history = Storage.exportHistory();
        const blob = new Blob([history], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Show import dialog
     */
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const success = Storage.importHistory(event.target.result);
                    if (success) {
                        this.state.messages = Storage.loadChatHistory();
                        this._render();
                        this._scrollChatToBottom();
                        console.log('Chat history imported successfully');
                    } else {
                        this._showError('Invalid chat history file format');
                    }
                } catch (error) {
                    this._showError(`Failed to import: ${error.message}`);
                }
            };
            reader.readAsText(file);
        });

        input.click();
    },

    /**
     * Clear chat history
     */
    clearChatHistory() {
        if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
            Storage.clearChatHistory();
            this.state.messages = [];
            this._render();
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

        if (this.state.messages.length === 0) {
            chatHistory.innerHTML = '<div class="chat-empty-state"><p>Start a conversation to begin</p></div>';
            return;
        }

        chatHistory.innerHTML = this.state.messages
            .map(msg => `
                <div style="
                    padding: var(--spacing-md);
                    background-color: ${msg.role === 'user' ? 'var(--primary-light)' : 'var(--background-light)'};
                    border-radius: 0.375rem;
                    color: ${msg.role === 'user' ? 'white' : 'var(--text-primary)'};
                    word-break: break-word;
                ">
                    <strong>${msg.role === 'user' ? '👤 You' : '🤖 Assistant'}:</strong>
                    <p style="margin-top: var(--spacing-sm);">${this._escapeHtml(msg.content)}</p>
                </div>
            `)
            .join('');
    },

    /**
     * Update suggestions
     * @private
     */
    _updateSuggestions() {
        const suggestionsList = document.getElementById('suggestions-list');
        if (!suggestionsList) return;

        const suggestions = Suggestions.generateSuggestions(this.state.messages);
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
     * Show error message
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
