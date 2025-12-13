const express = require('express');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { UserAuthenticator } = require("../authentication/user.authenticator");
const { SessionHandler } = require("../authentication/sessionHandler");

const logsRouter = express.Router();
logsRouter.use(express.json());

/**
 * Download log files as a zip archive
 * GET /logs/download?sessionToken=xxx&startDate=2025-12-01&endDate=2025-12-13
 * 
 * Query parameters:
 * - sessionToken: Required. User session token for authentication
 * - startDate: Optional. Start date in YYYY-MM-DD format (inclusive)
 * - endDate: Optional. End date in YYYY-MM-DD format (inclusive)
 * 
 * If no dates provided, downloads all available logs
 */
logsRouter.get('/download', async (req, res) => {
    try {
        const sessionTokenString = req.query.sessionToken;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(req, res, async () => {
            // Authenticate user
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }

            // Check authority level (requiring level 5 for log access)
            if (!auth.checkAuthorityLevel(5)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }

            // Validate date format if provided
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (startDate && !dateRegex.test(startDate)) {
                res.status(400).send({ "message": "Invalid startDate format. Use YYYY-MM-DD" });
                return;
            }
            if (endDate && !dateRegex.test(endDate)) {
                res.status(400).send({ "message": "Invalid endDate format. Use YYYY-MM-DD" });
                return;
            }

            const logsDir = path.join(__dirname, '../logs');

            // Check if logs directory exists
            if (!fs.existsSync(logsDir)) {
                res.status(404).send({ "message": "Logs directory not found" });
                return;
            }

            // Collect log files based on date range
            const logFiles = [];

            const collectLogsRecursively = (dir, relativePath = '') => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

                    if (entry.isDirectory()) {
                        collectLogsRecursively(fullPath, relPath);
                    } else if (entry.isFile() && entry.name.endsWith('.log')) {
                        // Extract date from path (e.g., 2025/12/day13.log -> 2025-12-13)
                        // Split using forward slashes (normalized path separator)
                        const pathParts = relPath.split(/[\/\\]/);

                        // Need at least year/month/dayXX.log structure
                        if (pathParts.length >= 3) {
                            const year = pathParts[pathParts.length - 3];
                            const month = pathParts[pathParts.length - 2];
                            const dayMatch = entry.name.match(/day(\d+)\.log/);

                            if (dayMatch) {
                                const day = dayMatch[1].padStart(2, '0');
                                const logDate = `${year}-${month.padStart(2, '0')}-${day}`;

                                // Check if log is within date range
                                let includeLog = true;
                                if (startDate && logDate < startDate) includeLog = false;
                                if (endDate && logDate > endDate) includeLog = false;

                                if (includeLog) {
                                    logFiles.push({
                                        path: fullPath,
                                        relativePath: relPath,
                                        date: logDate
                                    });
                                }
                            }
                        }
                    }
                }
            };

            collectLogsRecursively(logsDir);

            if (logFiles.length === 0) {
                res.status(404).send({
                    "message": "No log files found for the specified date range",
                    "startDate": startDate || "N/A",
                    "endDate": endDate || "N/A"
                });
                return;
            }

            // Sort by date
            logFiles.sort((a, b) => a.date.localeCompare(b.date));

            // Create filename for the zip
            const dateRange = startDate && endDate
                ? `${startDate}_to_${endDate}`
                : startDate
                    ? `from_${startDate}`
                    : endDate
                        ? `until_${endDate}`
                        : 'all';
            const zipFilename = `logs_${dateRange}.zip`;

            // Set response headers
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

            // Create archive
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            // Handle archive errors
            archive.on('error', (err) => {
                console.error('Archive error:', err);
                if (!res.headersSent) {
                    res.status(500).send({ "message": "Error creating zip archive" });
                }
            });

            // Pipe archive to response
            archive.pipe(res);

            // Add log files to archive
            for (const logFile of logFiles) {
                archive.file(logFile.path, { name: logFile.relativePath });
            }

            // Finalize the archive
            await archive.finalize();
        });
    } catch (error) {
        console.error('Error in logs download endpoint:', error);
        if (!res.headersSent) {
            res.status(500).send({ "message": error.message });
        }
    }
});

module.exports = { logsRouter };
