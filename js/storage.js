/**
 * Storage Module
 * Handles local storage operations for chat history and user preferences
 */

const Storage = {
    /**
     * Save chat history to local storage
     * @param {Array} messages - Array of message objects
     */
    saveChatHistory(messages) {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(messages));
        } catch (error) {
            console.error('Failed to save chat history:', error);
        }
    },

    /**
     * Load chat history from local storage
     * @returns {Array} Array of message objects
     */
    loadChatHistory() {
        try {
            const history = localStorage.getItem('chatHistory');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Failed to load chat history:', error);
            return [];
        }
    },

    /**
     * Clear all chat history
     */
    clearChatHistory() {
        try {
            localStorage.removeItem('chatHistory');
        } catch (error) {
            console.error('Failed to clear chat history:', error);
        }
    },

    /**
     * Save user preferences
     * @param {Object} preferences - User preference settings
     */
    savePreferences(preferences) {
        try {
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    },

    /**
     * Load user preferences
     * @returns {Object} User preference settings
     */
    loadPreferences() {
        try {
            const prefs = localStorage.getItem('userPreferences');
            return prefs ? JSON.parse(prefs) : {};
        } catch (error) {
            console.error('Failed to load preferences:', error);
            return {};
        }
    },

    /**
     * Export chat history as JSON
     * @returns {string} JSON string of chat history
     */
    exportHistory() {
        const history = this.loadChatHistory();
        return JSON.stringify(history, null, 2);
    },

    /**
     * Import chat history from JSON
     * @param {string} jsonString - JSON string of chat history
     * @returns {boolean} Success status
     */
    importHistory(jsonString) {
        try {
            const history = JSON.parse(jsonString);
            if (Array.isArray(history)) {
                this.saveChatHistory(history);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to import history:', error);
            return false;
        }
    }
};
