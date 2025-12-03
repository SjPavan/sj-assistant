/**
 * Website Analyzer Module
 * Analyzes websites and extracts business intelligence using AI
 */

const WebsiteAnalyzer = {
    /**
     * Check if a message contains a URL to analyze
     * @param {string} message - User message
     * @returns {string|null} URL if found, null otherwise
     */
    extractUrl(message) {
        // Enhanced URL regex that matches more URL patterns including localhost
        const urlRegex = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*))|(https?:\/\/localhost:\d+)|(https?:\/\/127\.0\.0\.1:\d+)/g;
        const matches = message.match(urlRegex);
        
        if (!matches || matches.length === 0) {
            return null;
        }
        
        // Return the first valid URL
        return matches[0];
    },

    /**
     * Validate if URL is properly formatted
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    },

    /**
     * Check if message is requesting website analysis
     * @param {string} message - User message
     * @returns {boolean} True if requesting analysis
     */
    isAnalysisRequest(message) {
        const analysisKeywords = [
            'analyze', 'review', 'examine', 'inspect', 'evaluate',
            'website', 'site', 'business', 'company', 'extract',
            'information', 'details', 'intelligence', 'analyze this'
        ];
        
        const lowerMessage = message.toLowerCase();
        return analysisKeywords.some(keyword => lowerMessage.includes(keyword)) && 
               this.extractUrl(message);
    },

    /**
     * Fetch website content
     * @param {string} url - Website URL to fetch
     * @returns {Promise<string>} Website content
     */
    async fetchWebsiteContent(url) {
        try {
            // Try multiple CORS proxy services
            const proxies = [
                `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
                `https://corsproxy.io/?${encodeURIComponent(url)}`,
                `https://cors-anywhere.herokuapp.com/${url}`
            ];
            
            let data = null;
            let lastError = null;
            
            for (const proxyUrl of proxies) {
                try {
                    const response = await fetch(proxyUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (response.ok) {
                        if (proxyUrl.includes('allorigins')) {
                            const result = await response.json();
                            if (result.contents) {
                                data = result.contents;
                                break;
                            }
                        } else {
                            data = await response.text();
                            break;
                        }
                    }
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }
            
            if (!data) {
                throw new Error(lastError?.message || 'All proxy services failed');
            }
            
            // Parse HTML and extract text content
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');
            
            // Remove script and style elements
            doc.querySelectorAll('script, style, nav, footer, header, aside, .menu, .navigation, .sidebar').forEach(el => el.remove());
            
            // Extract key information
            const title = doc.querySelector('title')?.textContent?.trim() || '';
            const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || 
                               doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';
            
            // Try to find main content areas
            const contentSelectors = [
                'main', 'article', '.main', '.content', '#content', 
                '.post-content', '.entry-content', '.page-content',
                '[role="main"]', '.container', '.wrapper'
            ];
            
            let mainContent = '';
            for (const selector of contentSelectors) {
                const element = doc.querySelector(selector);
                if (element && element.textContent.trim().length > 100) {
                    mainContent = element.textContent;
                    break;
                }
            }
            
            // Fallback to body if no main content found
            if (!mainContent || mainContent.length < 100) {
                mainContent = doc.querySelector('body')?.textContent || '';
            }
            
            // Clean up text
            const cleanContent = mainContent
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ' ')
                .replace(/\t+/g, ' ')
                .trim()
                .substring(0, 10000); // Limit content length
            
            if (!cleanContent || cleanContent.length < 50) {
                throw new Error('Insufficient content extracted from website');
            }
            
            return `Title: ${title}\nDescription: ${description}\nContent: ${cleanContent}`;
        } catch (error) {
            console.error('Error fetching website:', error);
            throw new Error(`Failed to fetch website content: ${error.message}`);
        }
    },

    /**
     * Analyze website content using AI
     * @param {string} content - Website content
     * @param {string} url - Original URL
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeWithAI(content, url) {
        const prompt = `You are a business intelligence expert. Analyze the following website content and extract specific business information in JSON format:

URL: ${url}

Content: ${content}

Please extract and return ONLY a JSON object with this exact structure:
{
    "companyName": "Company name (extract from title, about section, or main branding)",
    "businessDescription": "Clear 2-3 sentence description of what the company does",
    "industry": "Industry classification (e.g., Technology, Healthcare, Finance, Retail, etc.)",
    "businessType": "Either 'B2B' (business-to-business) or 'B2C' (business-to-consumer)",
    "category": "Specific business category (e.g., SaaS, E-commerce, Consulting, Manufacturing)",
    "marketableSummary": "Exactly 3-5 words, compelling and profitable summary"
}

CRITICAL REQUIREMENTS:
1. Return ONLY the JSON object, no additional text or explanations
2. If information is not clearly available, use "Unknown" or "Not specified"
3. marketableSummary MUST be exactly 3-5 words maximum
4. businessType MUST be exactly "B2B" or "B2C" (not both)
5. Be specific and accurate based only on the content provided
6. Do not make up information not present in the content

Example of correct format:
{"companyName": "TechCorp Inc", "businessDescription": "Develops cloud-based software solutions for enterprise clients", "industry": "Technology", "businessType": "B2B", "category": "SaaS", "marketableSummary": "Enterprise Cloud Solutions"}`;

        try {
            const response = await AIClient.sendMessage(prompt, []);
            
            // Clean the response to extract JSON
            let jsonStr = response.trim();
            
            // Remove any markdown code blocks
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Find JSON object in the response
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI response did not contain valid JSON');
            }
            
            const analysis = JSON.parse(jsonMatch[0]);
            
            // Validate and normalize required fields
            const requiredFields = ['companyName', 'businessDescription', 'industry', 'businessType', 'category', 'marketableSummary'];
            for (const field of requiredFields) {
                if (!analysis[field] || analysis[field].trim() === '') {
                    analysis[field] = 'Unknown';
                } else {
                    analysis[field] = analysis[field].trim();
                }
            }
            
            // Validate businessType
            if (analysis.businessType !== 'B2B' && analysis.businessType !== 'B2C') {
                // Try to determine from content
                const contentLower = content.toLowerCase();
                if (contentLower.includes('enterprise') || contentLower.includes('business') || 
                    contentLower.includes('corporate') || contentLower.includes('b2b')) {
                    analysis.businessType = 'B2B';
                } else if (contentLower.includes('consumer') || contentLower.includes('customer') || 
                          contentLower.includes('retail') || contentLower.includes('b2c')) {
                    analysis.businessType = 'B2C';
                } else {
                    analysis.businessType = 'Unknown';
                }
            }
            
            // Validate marketableSummary length
            if (analysis.marketableSummary && analysis.marketableSummary !== 'Unknown') {
                const words = analysis.marketableSummary.split(' ').filter(word => word.length > 0);
                if (words.length > 5) {
                    analysis.marketableSummary = words.slice(0, 5).join(' ');
                } else if (words.length < 3) {
                    analysis.marketableSummary = 'Unknown';
                }
            }
            
            return analysis;
        } catch (error) {
            console.error('Error analyzing with AI:', error);
            throw new Error(`AI analysis failed: ${error.message}`);
        }
    },

    /**
     * Format analysis results for display
     * @param {Object} analysis - Analysis results
     * @param {string} url - Original URL
     * @returns {string} Formatted results
     */
    formatResults(analysis, url) {
        const businessTypeIcon = analysis.businessType === 'B2B' ? '🏢' : analysis.businessType === 'B2C' ? '👥' : '❓';
        const industryIcon = this._getIndustryIcon(analysis.industry);
        
        return `🌐 **Website Business Intelligence Analysis**

${businessTypeIcon} **URL:** ${url}

---

🏢 **Company Name**
${analysis.companyName}

📋 **Business Description**
${analysis.businessDescription}

${industryIcon} **Industry Classification**
${analysis.industry}

${businessTypeIcon} **Business Model**
${analysis.businessType}

📂 **Business Category**
${analysis.category}

✨ **Marketable Summary**
**${analysis.marketableSummary}**

---

*Analysis completed using AI-powered business intelligence extraction*`;
    },

    /**
     * Get industry-specific icon
     * @private
     * @param {string} industry - Industry name
     * @returns {string} Icon emoji
     */
    _getIndustryIcon(industry) {
        const industryLower = industry.toLowerCase();
        if (industryLower.includes('tech') || industryLower.includes('software')) return '💻';
        if (industryLower.includes('health') || industryLower.includes('medical')) return '🏥';
        if (industryLower.includes('finance') || industryLower.includes('bank')) return '💰';
        if (industryLower.includes('retail') || industryLower.includes('shop')) return '🛍️';
        if (industryLower.includes('education') || industryLower.includes('learn')) return '🎓';
        if (industryLower.includes('food') || industryLower.includes('restaurant')) return '🍽️';
        if (industryLower.includes('travel') || industryLower.includes('tourism')) return '✈️';
        if (industryLower.includes('real') || industryLower.includes('property')) return '🏠';
        if (industryLower.includes('energy') || industryLower.includes('power')) return '⚡';
        if (industryLower.includes('manufacturing') || industryLower.includes('production')) return '🏭';
        return '🏭'; // Default industry icon
    },

    /**
     * Perform complete website analysis
     * @param {string} url - Website URL to analyze
     * @returns {Promise<string>} Formatted analysis results
     */
    async analyzeWebsite(url) {
        try {
            // Fetch website content
            const content = await this.fetchWebsiteContent(url);
            
            // Analyze with AI
            const analysis = await this.analyzeWithAI(content, url);
            
            // Format results
            return this.formatResults(analysis, url);
        } catch (error) {
            throw error;
        }
    }
};