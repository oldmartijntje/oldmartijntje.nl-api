const fs = require('fs');
const path = require('path');

class RequestLogger {
    constructor() {
        this.logsBasePath = path.join(__dirname, '..', 'logs');
        this.ensureLogsDirectory();

        // Initialize buffers and flush interval
        this.logBuffer = [];
        this.flushInterval = 10000; // Flush every 5 seconds
        this.startBufferFlusher();
    }

    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsBasePath)) {
            fs.mkdirSync(this.logsBasePath, { recursive: true });
        }
    }

    startBufferFlusher() {
        this.flushTimer = setInterval(() => {
            this.flushBuffer();
        }, this.flushInterval);

        // Ensure buffer is flushed on process exit
        process.on('exit', () => this.flushBuffer());
        process.on('SIGINT', async () => {
            this.flushBuffer();
            // Sync rate limit data
            const { shutdown } = require('./rateLimitUtils');
            await shutdown();
            process.exit();
        });
        process.on('SIGTERM', async () => {
            this.flushBuffer();
            // Sync rate limit data
            const { shutdown } = require('./rateLimitUtils');
            await shutdown();
            process.exit();
        });
    }

    flushBuffer() {
        if (this.logBuffer.length === 0) return;

        try {
            const logFilePath = this.getLogFilePath();
            const logData = this.logBuffer.join('');
            fs.appendFileSync(logFilePath, logData, 'utf8');
            this.logBuffer = []; // Clear the buffer after flushing
        } catch (error) {
            console.error(`Error flushing log buffer: ${error}`);
        }
    }

    getLogFilePath() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');

        const yearPath = path.join(this.logsBasePath, year.toString());
        const monthPath = path.join(yearPath, month);

        // Create directory structure if it doesn't exist
        if (!fs.existsSync(yearPath)) {
            fs.mkdirSync(yearPath, { recursive: true });
        }
        if (!fs.existsSync(monthPath)) {
            fs.mkdirSync(monthPath, { recursive: true });
        }

        return path.join(monthPath, `day${day}.log`);
    }

    formatLogEntry(req, res, responseTime) {
        const logEntry = {
            logType: "WEB_REQUEST",
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            contentLength: res.get('Content-Length') || '-',
            responseTime: `${responseTime}ms`
        };

        return JSON.stringify(logEntry) + '\n';
    }

    log(req, res, responseTime) {
        try {
            const logFilePath = this.getLogFilePath();
            const logEntry = this.formatLogEntry(req, res, responseTime);

            fs.appendFileSync(logFilePath, logEntry, 'utf8');
        } catch (error) {
            requestLogger.logInternalString("ERROR", `Error writing to log file: ${error}`);
        }
    }

    logInternalString(logType, message) {
        const logEntry = {
            logType: "INTERNAL_LOGGING",
            timestamp: new Date().toISOString(),
            level: logType,
            message: message
        };

        this.logBuffer.push(JSON.stringify(logEntry) + '\n');
    }

    logUserFlow(data) {
        data.logType = "USER_FLOW";
        data.timestamp = new Date().toISOString();

        this.logBuffer.push(JSON.stringify(data) + '\n');
    }

    failedSecurityFlag(error) {
        this.logInternalString("ERROR", `Error creating security flag: ${error}`);
    }

    error(error) {
        this.logInternalString("ERROR", `${error}`);
    }

    // Middleware function
    middleware() {
        return (req, res, next) => {
            const start = Date.now();

            // Override res.end to capture when response is sent
            const originalEnd = res.end;
            res.end = (...args) => {
                const responseTime = Date.now() - start;
                this.log(req, res, responseTime);
                originalEnd.apply(res, args);
            };

            next();
        };
    }
}

// Export singleton instance
const requestLogger = new RequestLogger();

module.exports = {
    RequestLogger,
    requestLogger
};