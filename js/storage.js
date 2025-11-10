/**
 * Storage Module
 * Comprehensive storage layer handling both localStorage and IndexedDB
 * 
 * LocalStorage Usage:
 * - userPreferences: User settings and theme preferences
 * - geminiApiKey: API key for AI client (can be sessionStorage too)
 * - userProfile: Basic user information (name, email, etc.)
 * 
 * IndexedDB Usage:
 * - Database name: 'SJAssistant'
 * - Version: 1 (incrementable for migrations)
 * - Stores:
 *   - conversations: Full conversation transcripts with messages and metadata
 *     - Index: by timestamp for chronological ordering
 *   - sessions: Session metadata and user profile data (optional, for future use)
 * 
 * All async operations include error handling with fallback to in-memory storage
 */

const Storage = {
  // Configuration constants
  DB_NAME: 'SJAssistant',
  DB_VERSION: 1,
  STORES: {
    CONVERSATIONS: 'conversations',
    SESSIONS: 'sessions'
  },
  
  // In-memory fallback storage (used when IndexedDB is unavailable)
  _fallbackStore: {
    conversations: [],
    sessions: []
  },
  
  // IndexedDB instance reference
  _db: null,
  
  // Flag to track initialization status
  _initialized: false,
  _initPromise: null,
  
  /**
   * Initialize storage system
   * Opens IndexedDB and performs migrations if needed
   * Must be called on app bootstrap
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) {
      return;
    }
    
    if (this._initPromise) {
      return this._initPromise;
    }
    
    this._initPromise = this._performInitialization();
    await this._initPromise;
    return;
  },
  
  /**
   * Perform actual initialization with error handling
   * @private
   * @returns {Promise<void>}
   */
  async _performInitialization() {
    try {
      await this._openDatabase();
      this._initialized = true;
      console.log('Storage system initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize IndexedDB, using fallback storage:', error);
      this._initialized = true;
      this._db = null; // Ensure db is null to trigger fallback
    }
  },
  
  /**
   * Open or create IndexedDB database with schema
   * @private
   * @returns {Promise<void>}
   */
  _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };
      
      request.onsuccess = () => {
        this._db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this._createSchema(db, event.oldVersion);
      };
    });
  },
  
  /**
   * Create or update database schema
   * @private
   * @param {IDBDatabase} db - Database instance
   * @param {number} oldVersion - Previous database version
   */
  _createSchema(db, oldVersion) {
    // Version 1: Initial schema
    if (oldVersion < 1) {
      // Conversations store: stores full conversation transcripts
      if (!db.objectStoreNames.contains(this.STORES.CONVERSATIONS)) {
        const conversationStore = db.createObjectStore(
          this.STORES.CONVERSATIONS,
          { keyPath: 'id', autoIncrement: true }
        );
        // Index by timestamp for chronological retrieval
        conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Sessions store: stores session metadata and user profiles
      if (!db.objectStoreNames.contains(this.STORES.SESSIONS)) {
        const sessionStore = db.createObjectStore(
          this.STORES.SESSIONS,
          { keyPath: 'id' }
        );
        // Index by creation timestamp
        sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    }
    
    // Future migrations would go here
    // if (oldVersion < 2) { ... }
  },
  
  /**
   * Ensure database is initialized before operations
   * @private
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (!this._initialized) {
      await this.initialize();
    }
  },
  
  /**
   * Check if IndexedDB is available and usable
   * @private
   * @returns {boolean}
   */
  _isDbAvailable() {
    return this._db !== null && typeof this._db !== 'undefined';
  },
  
  // ==================== LOCALSTORAGE OPERATIONS ====================
  
  /**
   * Save user preferences to localStorage
   * @param {Object} preferences - Preference object (theme, language, etc.)
   * @returns {boolean} Success status
   */
  savePreferences(preferences) {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  },
  
  /**
   * Load user preferences from localStorage
   * @returns {Object} Preference object or empty object if none exist
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
   * Save API key to localStorage (can also use sessionStorage for security)
   * @param {string} apiKey - API key to save
   * @param {boolean} useSession - If true, use sessionStorage instead of localStorage
   * @returns {boolean} Success status
   */
  saveApiKey(apiKey, useSession = false) {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem('geminiApiKey', apiKey);
      return true;
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  },
  
  /**
   * Load API key from storage
   * Checks sessionStorage first (more secure), then localStorage
   * @returns {string|null} API key or null if not found
   */
  loadApiKey() {
    try {
      // Check sessionStorage first (more secure for session-specific keys)
      const sessionKey = sessionStorage.getItem('geminiApiKey');
      if (sessionKey) {
        return sessionKey;
      }
      
      // Fall back to localStorage
      const storageKey = localStorage.getItem('geminiApiKey');
      if (storageKey) {
        return storageKey;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load API key:', error);
      return null;
    }
  },
  
  /**
   * Save user profile to localStorage
   * @param {Object} profile - Profile object (name, email, avatar, etc.)
   * @returns {boolean} Success status
   */
  saveUserProfile(profile) {
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Failed to save user profile:', error);
      return false;
    }
  },
  
  /**
   * Load user profile from localStorage
   * @returns {Object} Profile object or empty object if none exists
   */
  loadUserProfile() {
    try {
      const profile = localStorage.getItem('userProfile');
      return profile ? JSON.parse(profile) : {};
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return {};
    }
  },
  
  /**
   * Clear all localStorage data
   * @returns {boolean} Success status
   */
  clearLocalStorage() {
    try {
      localStorage.removeItem('userPreferences');
      localStorage.removeItem('geminiApiKey');
      localStorage.removeItem('userProfile');
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  },
  
  // ==================== INDEXEDDB CONVERSATION OPERATIONS ====================
  
  /**
   * Start a new conversation
   * @param {string} title - Optional conversation title
   * @returns {Promise<number>} Conversation ID or null on failure
   */
  async startConversation(title = null) {
    await this._ensureInitialized();
    
    const conversation = {
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
      messages: [],
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (this._isDbAvailable()) {
      try {
        return await this._addToStore(
          this.STORES.CONVERSATIONS,
          conversation
        );
      } catch (error) {
        console.error('Failed to start conversation in IndexedDB:', error);
        return this._fallbackStartConversation(conversation);
      }
    } else {
      return this._fallbackStartConversation(conversation);
    }
  },
  
  /**
   * Fallback: start conversation in memory
   * @private
   */
  _fallbackStartConversation(conversation) {
    const id = this._fallbackStore.conversations.length + 1;
    conversation.id = id;
    this._fallbackStore.conversations.push(conversation);
    return id;
  },
  
  /**
   * Add a message to a conversation
   * @param {number} conversationId - Conversation ID
   * @param {Object} message - Message object with role, content, timestamp
   * @returns {Promise<boolean>} Success status
   */
  async addMessage(conversationId, message) {
    await this._ensureInitialized();
    
    const messageWithMeta = {
      ...message,
      timestamp: message.timestamp || Date.now(),
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    if (this._isDbAvailable()) {
      try {
        return await this._updateConversationMessages(
          conversationId,
          messageWithMeta
        );
      } catch (error) {
        console.error('Failed to add message in IndexedDB:', error);
        return this._fallbackAddMessage(conversationId, messageWithMeta);
      }
    } else {
      return this._fallbackAddMessage(conversationId, messageWithMeta);
    }
  },
  
  /**
   * Update conversation with new message in IndexedDB
   * @private
   */
  _updateConversationMessages(conversationId, message) {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction(
        [this.STORES.CONVERSATIONS],
        'readwrite'
      );
      const store = transaction.objectStore(this.STORES.CONVERSATIONS);
      const request = store.get(conversationId);
      
      request.onsuccess = () => {
        const conversation = request.result;
        if (!conversation) {
          reject(new Error(`Conversation ${conversationId} not found`));
          return;
        }
        
        conversation.messages.push(message);
        conversation.updatedAt = new Date().toISOString();
        
        const updateRequest = store.put(conversation);
        updateRequest.onsuccess = () => resolve(true);
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  },
  
  /**
   * Fallback: add message in memory
   * @private
   */
  _fallbackAddMessage(conversationId, message) {
    const conversation = this._fallbackStore.conversations.find(
      c => c.id === conversationId
    );
    if (conversation) {
      conversation.messages.push(message);
      conversation.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  },
  
  /**
   * Fetch conversation history by ID
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<Object|null>} Conversation object or null if not found
   */
  async fetchConversation(conversationId) {
    await this._ensureInitialized();
    
    if (this._isDbAvailable()) {
      try {
        return await this._getFromStore(
          this.STORES.CONVERSATIONS,
          conversationId
        );
      } catch (error) {
        console.error('Failed to fetch conversation from IndexedDB:', error);
        return this._fallbackFetchConversation(conversationId);
      }
    } else {
      return this._fallbackFetchConversation(conversationId);
    }
  },
  
  /**
   * Fallback: fetch conversation from memory
   * @private
   */
  _fallbackFetchConversation(conversationId) {
    return this._fallbackStore.conversations.find(c => c.id === conversationId) || null;
  },
  
  /**
   * Fetch all conversations (for listing/sidebar)
   * @returns {Promise<Array>} Array of conversation objects (without full message content for efficiency)
   */
  async fetchAllConversations() {
    await this._ensureInitialized();
    
    if (this._isDbAvailable()) {
      try {
        return await this._getAllFromStore(this.STORES.CONVERSATIONS);
      } catch (error) {
        console.error('Failed to fetch conversations from IndexedDB:', error);
        return this._fallbackFetchAllConversations();
      }
    } else {
      return this._fallbackFetchAllConversations();
    }
  },
  
  /**
   * Fallback: fetch all conversations from memory
   * @private
   */
  _fallbackFetchAllConversations() {
    return this._fallbackStore.conversations.map(c => ({
      id: c.id,
      title: c.title,
      timestamp: c.timestamp,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length
    }));
  },
  
  /**
   * Delete a conversation
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteConversation(conversationId) {
    await this._ensureInitialized();
    
    if (this._isDbAvailable()) {
      try {
        return await this._deleteFromStore(
          this.STORES.CONVERSATIONS,
          conversationId
        );
      } catch (error) {
        console.error('Failed to delete conversation from IndexedDB:', error);
        return this._fallbackDeleteConversation(conversationId);
      }
    } else {
      return this._fallbackDeleteConversation(conversationId);
    }
  },
  
  /**
   * Fallback: delete conversation from memory
   * @private
   */
  _fallbackDeleteConversation(conversationId) {
    const index = this._fallbackStore.conversations.findIndex(
      c => c.id === conversationId
    );
    if (index !== -1) {
      this._fallbackStore.conversations.splice(index, 1);
      return true;
    }
    return false;
  },
  
  /**
   * Clear all conversations and chat history
   * @returns {Promise<boolean>} Success status
   */
  async clearAllConversations() {
    await this._ensureInitialized();
    
    if (this._isDbAvailable()) {
      try {
        return await this._clearStore(this.STORES.CONVERSATIONS);
      } catch (error) {
        console.error('Failed to clear conversations from IndexedDB:', error);
        return this._fallbackClearAllConversations();
      }
    } else {
      return this._fallbackClearAllConversations();
    }
  },
  
  /**
   * Fallback: clear all conversations from memory
   * @private
   */
  _fallbackClearAllConversations() {
    this._fallbackStore.conversations = [];
    return true;
  },
  
  // ==================== DATA EXPORT/IMPORT ====================
  
  /**
   * Export all data as a JSON snapshot
   * Includes conversations and user preferences
   * @returns {Promise<Object>} Complete data snapshot
   */
  async exportDataSnapshot() {
    await this._ensureInitialized();
    
    const conversations = await this.fetchAllConversations();
    const preferences = this.loadPreferences();
    const profile = this.loadUserProfile();
    
    // Fetch full conversation details if needed
    const fullConversations = [];
    for (const conv of conversations) {
      const fullConv = await this.fetchConversation(conv.id);
      if (fullConv) {
        fullConversations.push(fullConv);
      }
    }
    
    const snapshot = {
      version: this.DB_VERSION,
      exportDate: new Date().toISOString(),
      data: {
        conversations: fullConversations,
        preferences,
        profile
      }
    };
    
    return snapshot;
  },
  
  /**
   * Export data as JSON string for download
   * @returns {Promise<string>} JSON string of exported data
   */
  async exportDataAsJson() {
    const snapshot = await this.exportDataSnapshot();
    return JSON.stringify(snapshot, null, 2);
  },
  
  /**
   * Import data from a snapshot
   * @param {Object|string} data - Snapshot object or JSON string
   * @returns {Promise<boolean>} Success status
   */
  async importDataSnapshot(data) {
    await this._ensureInitialized();
    
    try {
      const snapshot = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!snapshot.data) {
        throw new Error('Invalid snapshot format');
      }
      
      // Import preferences
      if (snapshot.data.preferences) {
        this.savePreferences(snapshot.data.preferences);
      }
      
      // Import profile
      if (snapshot.data.profile) {
        this.saveUserProfile(snapshot.data.profile);
      }
      
      // Import conversations
      if (Array.isArray(snapshot.data.conversations)) {
        for (const conversation of snapshot.data.conversations) {
          const { id, ...conversationData } = conversation;
          if (this._isDbAvailable()) {
            try {
              await this._addToStore(this.STORES.CONVERSATIONS, conversationData);
            } catch (error) {
              console.warn('Failed to import conversation:', error);
              this._fallbackStore.conversations.push(conversationData);
            }
          } else {
            this._fallbackStore.conversations.push(conversationData);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data snapshot:', error);
      return false;
    }
  },
  
  // ==================== PRIVATE INDEXEDDB HELPERS ====================
  
  /**
   * Add item to IndexedDB store
   * @private
   */
  _addToStore(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  /**
   * Get item from IndexedDB store by key
   * @private
   */
  _getFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  /**
   * Get all items from IndexedDB store
   * @private
   */
  _getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  /**
   * Delete item from IndexedDB store
   * @private
   */
  _deleteFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },
  
  /**
   * Clear all items from IndexedDB store
   * @private
   */
  _clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
};
