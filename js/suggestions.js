/**
 * Suggestions Module
 * Manages dynamic suggestions for the user
 */

const Suggestions = {
    /**
     * Get default suggestions
     * @returns {Array} Array of suggestion strings
     */
    getDefaultSuggestions() {
        return [
            '💡 Load sample conversation',
            '🔍 Ask a sample question',
            '⚙️ Show system info'
        ];
    },

    /**
     * Generate context-aware suggestions based on conversation
     * @param {Array} conversationHistory - Previous messages
     * @returns {Array} Array of suggestion strings
     */
    generateSuggestions(conversationHistory = []) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return this.getDefaultSuggestions();
        }

        // TODO: Implement logic to generate suggestions based on conversation context
        // This could analyze the last message and provide relevant follow-up suggestions
        return this.getDefaultSuggestions();
    },

    /**
     * Get quick action suggestions
     * @returns {Array} Array of quick action suggestions
     */
    getQuickActions() {
        return [
            { label: '📝 New Topic', action: 'newTopic' },
            { label: '🔄 Rephrase', action: 'rephrase' },
            { label: '📋 Summarize', action: 'summarize' },
            { label: '❓ Ask Details', action: 'askDetails' }
        ];
    },

    /**
     * Get example prompts
     * @returns {Array} Array of example prompts
     */
    getExamplePrompts() {
        return [
            'Explain quantum computing in simple terms',
            'What are the benefits of renewable energy?',
            'How does machine learning work?',
            'Write a short Python function to calculate factorial',
            'What is the capital of France?'
        ];
    }
};
