class ChatApp {
    constructor() {
        this.storage = new StorageManager();
        this.aiClient = new AIClient();
        this.currentConversationId = null;
        this.isWaitingForResponse = false;
        this.messages = [];
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
    }

    initEventListeners() {
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendMessage();
        });

        this.messageInput.addEventListener('input', () => {
            this.sendButton.disabled = !this.messageInput.value.trim() || this.isWaitingForResponse;
        });

        // Auto-scroll to bottom when new messages are added
        const observer = new MutationObserver(() => {
            this.scrollToBottom();
        });
        
        observer.observe(this.chatMessages, {
            childList: true,
            subtree: true
        });
    }

    async init() {
        try {
            await this.storage.init();
            await this.loadConversation();
            this.enableInput();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    async loadConversation() {
        try {
            let conversation = await this.storage.getLatestConversation();
            
            if (!conversation) {
                conversation = await this.createNewConversation();
            }

            this.currentConversationId = conversation.id;
            this.messages = await this.storage.getMessages(this.currentConversationId);
            
            this.renderMessages();
        } catch (error) {
            console.error('Failed to load conversation:', error);
            throw error;
        }
    }

    async createNewConversation() {
        const conversationId = await this.storage.createConversation();
        return { id: conversationId };
    }

    renderMessages() {
        this.chatMessages.innerHTML = '';
        
        this.messages.forEach(message => {
            this.renderMessage(message);
        });

        this.scrollToBottom();
    }

    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = message.role === 'user' ? 'U' : 'AI';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = message.content;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = this.formatTimestamp(message.timestamp);
        
        content.appendChild(text);
        content.appendChild(timestamp);
        
        messageElement.appendChild(avatar);
        messageElement.appendChild(content);
        
        this.chatMessages.appendChild(messageElement);
    }

    async handleSendMessage() {
        const messageText = this.messageInput.value.trim();
        
        if (!messageText || this.isWaitingForResponse) {
            return;
        }

        this.disableInput();
        this.isWaitingForResponse = true;
        this.showTypingIndicator();

        try {
            const userMessage = {
                role: 'user',
                content: messageText,
                timestamp: new Date().toISOString()
            };

            this.messages.push(userMessage);
            this.renderMessage(userMessage);
            
            await this.storage.saveMessage(this.currentConversationId, userMessage.role, userMessage.content);
            await this.storage.updateConversationTimestamp(this.currentConversationId);

            this.messageInput.value = '';

            const aiResponse = await this.aiClient.sendMessage(this.messages);
            
            const assistantMessage = {
                role: 'assistant',
                content: aiResponse.content,
                timestamp: new Date().toISOString()
            };

            this.messages.push(assistantMessage);
            this.renderMessage(assistantMessage);
            
            await this.storage.saveMessage(this.currentConversationId, assistantMessage.role, assistantMessage.content);
            await this.storage.updateConversationTimestamp(this.currentConversationId);

        } catch (error) {
            console.error('Failed to send message:', error);
            this.showError(error.message);
        } finally {
            this.hideTypingIndicator();
            this.isWaitingForResponse = false;
            this.enableInput();
            this.messageInput.focus();
        }
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    disableInput() {
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
    }

    enableInput() {
        this.messageInput.disabled = false;
        this.sendButton.disabled = !this.messageInput.value.trim();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
    }

    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'message error';
        errorElement.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message)}</div>
                <div class="message-timestamp">${this.formatTimestamp(new Date().toISOString())}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(errorElement);
        this.scrollToBottom();
        
        setTimeout(() => {
            errorElement.remove();
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async startNewConversation() {
        try {
            this.currentConversationId = await this.storage.createConversation();
            this.messages = [];
            this.renderMessages();
            this.enableInput();
            this.messageInput.focus();
        } catch (error) {
            console.error('Failed to start new conversation:', error);
            this.showError('Failed to start new conversation');
        }
    }

    setApiKey(apiKey) {
        this.aiClient.setApiKey(apiKey);
        console.log('API key set successfully');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new ChatApp();
    
    try {
        await app.init();
        
        // Check if API key is set, but don't block the app if not set
        try {
            app.aiClient.getApiKey();
            console.log('OpenAI API key found');
        } catch (error) {
            console.log('No API key found - running in demo mode');
            // Show a subtle info message about demo mode
            setTimeout(() => {
                app.showError('Running in demo mode. Set your OpenAI API key for real AI responses.');
            }, 1000);
        }
        
        // Enable input regardless of API key status
        app.enableInput();
        
    } catch (error) {
        console.error('Failed to start app:', error);
        app.showError('Failed to initialize application. Please refresh the page.');
    }
    
    // Make the app globally accessible for debugging and API key management
    window.chatApp = app;
    window.setApiKey = (key) => app.setApiKey(key);
});