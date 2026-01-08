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

        try {
            const logFilePath = this.getLogFilePath();
            fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n', 'utf8');
        } catch (error) {
            requestLogger.logInternalString("ERROR", `Error writing to log file: ${error}`);
        }
    }

    logUserFlow(data) {
        data.logType = "USER_FLOW";
        data.timestamp = new Date().toISOString();

        try {
            const logFilePath = this.getLogFilePath();
            fs.appendFileSync(logFilePath, JSON.stringify(data) + '\n', 'utf8');
        } catch (error) {
            requestLogger.logInternalString("ERROR", `Error writing to log file: ${error}`);
        }
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