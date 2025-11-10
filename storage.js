class StorageManager {
    constructor() {
        this.dbName = 'sj-assistant-db';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('conversations')) {
                    const conversationStore = db.createObjectStore('conversations', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    conversationStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    messageStore.createIndex('conversationId', 'conversationId', { unique: false });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async createConversation() {
        const conversation = {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            const request = store.add(conversation);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getLatestConversation() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const index = store.index('createdAt');
            const request = index.openCursor(null, 'prev');

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    resolve(cursor.value);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async saveMessage(conversationId, role, content) {
        const message = {
            conversationId,
            role,
            content,
            timestamp: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.add(message);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getMessages(conversationId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('conversationId');
            const request = index.getAll(conversationId);

            request.onsuccess = () => {
                const messages = request.result.sort((a, b) => 
                    new Date(a.timestamp) - new Date(b.timestamp)
                );
                resolve(messages);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateConversationTimestamp(conversationId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            const getRequest = store.get(conversationId);

            getRequest.onsuccess = () => {
                const conversation = getRequest.result;
                if (conversation) {
                    conversation.updatedAt = new Date().toISOString();
                    const updateRequest = store.put(conversation);
                    
                    updateRequest.onsuccess = () => resolve(updateRequest.result);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Conversation not found'));
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async clearAllData() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations', 'messages'], 'readwrite');
            
            const conversationsStore = transaction.objectStore('conversations');
            const messagesStore = transaction.objectStore('messages');
            
            const clearConversations = conversationsStore.clear();
            const clearMessages = messagesStore.clear();
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}