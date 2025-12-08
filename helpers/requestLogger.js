const fs = require('fs');
const path = require('path');

class RequestLogger {
    constructor() {
        this.logsBasePath = path.join(__dirname, '..', 'logs');
        this.ensureLogsDirectory();
    }

    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsBasePath)) {
            fs.mkdirSync(this.logsBasePath, { recursive: true });
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
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        const method = req.method;
        const url = req.originalUrl || req.url;
        const statusCode = res.statusCode;
        const contentLength = res.get('Content-Length') || '-';

        // Format: [timestamp] IP "METHOD URL HTTP/1.1" status contentLength "userAgent" responseTimeMs
        return `[${timestamp}] ${ip} "${method} ${url} HTTP/1.1" ${statusCode} ${contentLength} "${userAgent}" ${responseTime}ms\n`;
    }

    log(req, res, responseTime) {
        try {
            const logFilePath = this.getLogFilePath();
            const logEntry = this.formatLogEntry(req, res, responseTime);

            fs.appendFileSync(logFilePath, logEntry, 'utf8');
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
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