class AIClient {
    constructor() {
        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-3.5-turbo';
        this.maxTokens = 1000;
        this.temperature = 0.7;
    }

    async sendMessage(messages) {
        // Check if we're in demo mode (no API key)
        try {
            this.getApiKey();
        } catch (error) {
            // Return a mock response for demo purposes
            return {
                role: 'assistant',
                content: 'This is a demo response. To get real AI responses, please set your OpenAI API key by entering it when prompted or by running: localStorage.setItem("openai_api_key", "your-api-key-here") in the browser console.'
            };
        }

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getApiKey()}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    max_tokens: this.maxTokens,
                    temperature: this.temperature
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                return {
                    role: 'assistant',
                    content: data.choices[0].message.content
                };
            } else {
                throw new Error('No response from AI');
            }
        } catch (error) {
            console.error('AI Client Error:', error);
            
            if (error.message.includes('401')) {
                throw new Error('Invalid API key. Please check your configuration.');
            } else if (error.message.includes('429')) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your connection.');
            } else {
                throw new Error('Failed to get AI response. Please try again.');
            }
        }
    }

    getApiKey() {
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) {
            throw new Error('OpenAI API key not found. Please set it in localStorage with key "openai_api_key"');
        }
        return apiKey;
    }

    setApiKey(apiKey) {
        localStorage.setItem('openai_api_key', apiKey);
    }

    async testConnection() {
        try {
            await this.sendMessage([{
                role: 'user',
                content: 'Hello, can you respond with just "OK"?'
            }]);
            return true;
        } catch (error) {
            return false;
        }
    }
}