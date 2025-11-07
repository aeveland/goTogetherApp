// COMPREHENSIVE ERROR HANDLING STRATEGY FOR GOTOGETHER

class ErrorHandler {
    constructor() {
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.silentErrors = new Set(['weather', 'stats', 'non-critical']);
        this.userFriendlyMessages = new Map([
            ['network', 'Connection issue - trying again...'],
            ['auth', 'Please sign in again'],
            ['not_found', 'Content not available'],
            ['server', 'Service temporarily unavailable'],
            ['validation', 'Please check your input'],
            ['coordinates', 'Location data needed for weather']
        ]);
    }

    // Central error handling method
    async handleError(error, context = {}) {
        const errorInfo = this.analyzeError(error, context);
        
        // Decide handling strategy based on error type
        switch (errorInfo.strategy) {
            case 'retry':
                return await this.retryWithBackoff(errorInfo);
            case 'degrade':
                return this.gracefulDegradation(errorInfo);
            case 'silent':
                return this.silentFailure(errorInfo);
            case 'user_action':
                return this.requestUserAction(errorInfo);
            default:
                return this.defaultErrorHandling(errorInfo);
        }
    }

    // Analyze error to determine best handling strategy
    analyzeError(error, context) {
        const errorInfo = {
            originalError: error,
            context: context,
            timestamp: new Date(),
            userMessage: '',
            strategy: 'default',
            severity: 'medium',
            shouldLog: true,
            shouldRetry: false,
            isCritical: false
        };

        // HTTP Response errors
        if (error.response) {
            const status = error.response.status;
            errorInfo.httpStatus = status;

            if (status >= 500) {
                errorInfo.strategy = 'retry';
                errorInfo.severity = 'high';
                errorInfo.shouldRetry = true;
                errorInfo.userMessage = this.userFriendlyMessages.get('server');
            } else if (status === 401 || status === 403) {
                errorInfo.strategy = 'user_action';
                errorInfo.severity = 'high';
                errorInfo.isCritical = true;
                errorInfo.userMessage = this.userFriendlyMessages.get('auth');
            } else if (status === 404) {
                errorInfo.strategy = 'degrade';
                errorInfo.severity = 'low';
                errorInfo.userMessage = this.userFriendlyMessages.get('not_found');
            } else if (status === 400) {
                // Context-specific 400 handling
                if (context.feature === 'weather') {
                    errorInfo.strategy = 'silent';
                    errorInfo.severity = 'low';
                    errorInfo.shouldLog = false;
                    errorInfo.userMessage = this.userFriendlyMessages.get('coordinates');
                } else {
                    errorInfo.strategy = 'user_action';
                    errorInfo.userMessage = this.userFriendlyMessages.get('validation');
                }
            }
        }
        // Network errors
        else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorInfo.strategy = 'retry';
            errorInfo.shouldRetry = true;
            errorInfo.userMessage = this.userFriendlyMessages.get('network');
        }
        // JavaScript errors
        else if (error instanceof Error) {
            errorInfo.strategy = 'default';
            errorInfo.severity = 'high';
            errorInfo.shouldLog = true;
        }

        // Context-based adjustments
        if (context.feature && this.silentErrors.has(context.feature)) {
            errorInfo.strategy = 'silent';
            errorInfo.shouldLog = false;
        }

        if (context.critical) {
            errorInfo.isCritical = true;
            errorInfo.strategy = 'user_action';
        }

        return errorInfo;
    }

    // Retry with exponential backoff
    async retryWithBackoff(errorInfo) {
        const key = `${errorInfo.context.endpoint || 'unknown'}_${errorInfo.context.feature || 'default'}`;
        const attempts = this.retryAttempts.get(key) || 0;

        if (attempts >= this.maxRetries) {
            this.retryAttempts.delete(key);
            return this.gracefulDegradation(errorInfo);
        }

        this.retryAttempts.set(key, attempts + 1);
        
        // Show user feedback for retries
        if (attempts === 0) {
            this.showUserFeedback(errorInfo.userMessage, 'info');
        }

        // Exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, attempts);
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            // Retry the original operation
            if (errorInfo.context.retryFunction) {
                const result = await errorInfo.context.retryFunction();
                this.retryAttempts.delete(key);
                return { success: true, data: result };
            }
        } catch (retryError) {
            return await this.handleError(retryError, errorInfo.context);
        }

        return { success: false, error: errorInfo };
    }

    // Graceful degradation - show placeholder content
    gracefulDegradation(errorInfo) {
        if (errorInfo.shouldLog) {
            console.warn('Graceful degradation:', errorInfo.context.feature, errorInfo.originalError.message);
        }

        // Return appropriate placeholder based on context
        const placeholders = {
            weather: this.getWeatherPlaceholder(),
            tasks: this.getTasksPlaceholder(),
            stats: this.getStatsPlaceholder(),
            shopping: this.getShoppingPlaceholder()
        };

        const placeholder = placeholders[errorInfo.context.feature] || this.getGenericPlaceholder();
        
        return {
            success: false,
            degraded: true,
            placeholder: placeholder,
            userMessage: errorInfo.userMessage
        };
    }

    // Silent failure - don't show error to user
    silentFailure(errorInfo) {
        // Only log if it's actually important
        if (errorInfo.severity === 'high') {
            console.warn('Silent failure:', errorInfo.context.feature, errorInfo.originalError.message);
        }

        return {
            success: false,
            silent: true,
            placeholder: this.getMinimalPlaceholder(errorInfo.context.feature)
        };
    }

    // Request user action
    requestUserAction(errorInfo) {
        if (errorInfo.shouldLog) {
            console.error('User action required:', errorInfo.originalError.message);
        }

        this.showUserFeedback(errorInfo.userMessage, 'error');

        return {
            success: false,
            requiresUserAction: true,
            message: errorInfo.userMessage
        };
    }

    // Default error handling
    defaultErrorHandling(errorInfo) {
        console.error('Unhandled error:', errorInfo.originalError);
        
        this.showUserFeedback('Something went wrong. Please try again.', 'error');

        return {
            success: false,
            error: errorInfo.originalError
        };
    }

    // Show user feedback (integrate with existing message system)
    showUserFeedback(message, type = 'info') {
        // This would integrate with the existing showMessage method
        if (window.app && window.app.showMessage) {
            window.app.showMessage(message, type);
        }
    }

    // Placeholder generators
    getWeatherPlaceholder() {
        return `
            <div class="text-center py-4 text-gray-500">
                <span class="material-icons text-2xl mb-2 opacity-50">location_off</span>
                <p class="ios-footnote">Weather forecast unavailable</p>
                <p class="ios-caption text-xs">Location coordinates needed</p>
            </div>
        `;
    }

    getTasksPlaceholder() {
        return `
            <div class="text-center py-4 text-gray-500">
                <span class="material-icons text-2xl mb-2 opacity-50">assignment</span>
                <p class="ios-footnote">Tasks temporarily unavailable</p>
                <button onclick="window.location.reload()" class="ios-button-secondary mt-2">
                    <span class="material-icons mr-1" style="font-size: 14px;">refresh</span>
                    Refresh
                </button>
            </div>
        `;
    }

    getStatsPlaceholder() {
        return `
            <div class="text-center py-4 text-gray-500">
                <span class="material-icons text-2xl mb-2 opacity-50">analytics</span>
                <p class="ios-footnote">Statistics loading...</p>
            </div>
        `;
    }

    getShoppingPlaceholder() {
        return `
            <div class="text-center py-4 text-gray-500">
                <span class="material-icons text-2xl mb-2 opacity-50">shopping_cart</span>
                <p class="ios-footnote">Shopping list temporarily unavailable</p>
            </div>
        `;
    }

    getMinimalPlaceholder(feature) {
        return `<div class="opacity-50 text-center py-2 text-sm text-gray-500">Content loading...</div>`;
    }

    getGenericPlaceholder() {
        return `
            <div class="text-center py-4 text-gray-500">
                <span class="material-icons text-2xl mb-2 opacity-50">info</span>
                <p class="ios-footnote">Content temporarily unavailable</p>
            </div>
        `;
    }
}

// Enhanced fetch wrapper with automatic error handling
class ResilientFetch {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
    }

    async fetch(url, options = {}, context = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                credentials: 'include' // Default to include credentials
            });

            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}`);
                error.response = response;
                throw error;
            }

            return await response.json();
        } catch (error) {
            const handlingResult = await this.errorHandler.handleError(error, {
                ...context,
                endpoint: url,
                retryFunction: () => this.fetch(url, options, context)
            });

            if (handlingResult.success) {
                return handlingResult.data;
            } else {
                throw new Error(handlingResult.userMessage || 'Request failed');
            }
        }
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandler, ResilientFetch };
} else {
    window.ErrorHandler = ErrorHandler;
    window.ResilientFetch = ResilientFetch;
}
