/**
 * AI Client Module
 * Handles communication with the Gemini AI API
 */

const AIClient = {
    /**
     * Initialize the AI client with API key
     * @param {string} apiKey - Gemini API key
     */
    initialize(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    },

    /**
     * Send a message to the AI and get a response
     * @param {string} message - User message
     * @param {Array} conversationHistory - Previous messages for context
     * @returns {Promise<string>} AI response
     */
    async sendMessage(message, conversationHistory = []) {
        if (!this.apiKey) {
            throw new Error('AI Client not initialized. Please provide an API key.');
        }

        try {
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: this._buildContents(message, conversationHistory)
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return this._extractText(data);
        } catch (error) {
            console.error('Error sending message to AI:', error);
            throw error;
        }
    },

    /**
     * Build request contents for the API
     * @private
     * @param {string} message - Current message
     * @param {Array} history - Conversation history
     * @returns {Array} Formatted contents array
     */
    _buildContents(message, history) {
        const contents = [];

        // Add history if available
        if (history && history.length > 0) {
            for (const msg of history) {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            }
        }

        // Add current message
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        return contents;
    },

    /**
     * Extract text from API response
     * @private
     * @param {Object} data - API response data
     * @returns {string} Extracted text
     */
    _extractText(data) {
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                return candidate.content.parts[0].text;
            }
        }
        throw new Error('No text content in API response');
    }
};
