const { securityFlags } = require('../database.js');
const { requestLogger } = require('../helpers/requestLogger');

/**
 * SecurityFlag utility class for creating and managing security flags
 * Used to track potential security risks and suspicious activities
 */
class SecurityFlagHandler {
    /**
     * Create a new security flag
     * @param {Object} options - Security flag options
     * @param {string} options.ipAddress - The IP address of the request
     * @param {number} options.riskLevel - Risk level (1-5, 5 being highest)
     * @param {string} options.description - Description of the security event
     * @param {string} options.fileName - Source file where the flag was created
     * @param {Object} [options.req] - Express request object (optional)
     * @param {string} [options.userAgent] - User agent string
     * @param {string} [options.sessionToken] - Session token if available
     * @param {string} [options.userId] - User ID if available
     * @param {string} [options.quartzUserId] - QuartzForum user ID if available
     * @param {string} [options.implementationKey] - Implementation key if available
     * @param {Object} [options.additionalData] - Additional security data
     * @returns {Promise<Object>} The created security flag
     */
    static async createSecurityFlag(options) {
        try {
            const {
                ipAddress,
                riskLevel,
                description,
                fileName,
                req,
                userAgent,
                sessionToken,
                userId,
                quartzUserId,
                implementationKey,
                additionalData = {}
            } = options;

            // Extract data from request object if provided
            let extractedData = {};
            if (req) {
                extractedData = {
                    userAgent: req.get('User-Agent'),
                    requestMethod: req.method,
                    requestUrl: req.originalUrl || req.url,
                    requestHeaders: this.sanitizeHeaders(req.headers),
                    ipAddress: this.extractIpAddress(req)
                };

                // Debug logging for IP extraction (remove in production if needed)
                if (extractedData.ipAddress === 'unknown') {
                    console.warn('[SECURITY FLAG DEBUG] IP extraction failed. Available sources:', {
                        'req.ip': req.ip,
                        'x-forwarded-for': req.headers['x-forwarded-for'],
                        'x-real-ip': req.headers['x-real-ip'],
                        'x-client-ip': req.headers['x-client-ip'],
                        'connection.remoteAddress': req.connection?.remoteAddress,
                        'socket.remoteAddress': req.socket?.remoteAddress,
                        'cf-connecting-ip': req.headers['cf-connecting-ip']
                    });
                }
            }

            const securityFlag = new securityFlags({
                ipAddress: ipAddress || extractedData.ipAddress || 'unknown',
                riskLevel,
                description,
                fileName,
                userAgent: userAgent || extractedData.userAgent,
                sessionToken,
                userId,
                quartzUserId,
                implementationKey,
                requestMethod: extractedData.requestMethod,
                requestUrl: extractedData.requestUrl,
                requestHeaders: extractedData.requestHeaders || {},
                additionalData,
                dateTime: new Date()
            });

            const savedFlag = await securityFlag.save();
            console.warn(`[SECURITY FLAG] Risk Level ${riskLevel}: ${description} | IP: ${savedFlag.ipAddress} | File: ${fileName}`);

            return savedFlag;
        } catch (error) {
            requestLogger.logInternalString("ERROR", `Error creating security flag: ${error}`);
            throw error;
        }
    }

    /**
     * Extract IP address from request object
     * @param {Object} req - Express request object
     * @returns {string} IP address
     */
    static extractIpAddress(req) {
        // Priority order for extracting IP addresses, especially in containerized environments
        const possibleIPs = [
            // First check proxy headers (most reliable in Docker/proxy setups)
            req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
            req.headers['x-real-ip']?.trim(),
            req.headers['x-client-ip']?.trim(),
            req.headers['cf-connecting-ip']?.trim(), // Cloudflare
            req.headers['x-original-forwarded-for']?.split(',')[0]?.trim(),

            // Then check Express.js extracted IP (works when trust proxy is set correctly)
            req.ip,

            // Finally fallback to connection IPs (usually Docker internal IPs in containers)
            req.connection?.remoteAddress,
            req.socket?.remoteAddress,
            req.connection?.socket?.remoteAddress
        ];

        // Find the first valid IP address that's not a local/private network address
        for (const ip of possibleIPs) {
            if (ip && this.isValidPublicIP(ip)) {
                return ip;
            }
        }

        // If no public IP found, return the first available IP
        for (const ip of possibleIPs) {
            if (ip && ip !== '::1' && ip !== '127.0.0.1') {
                return ip;
            }
        }

        return 'unknown';
    }

    /**
     * Check if an IP address is a valid public IP (not local/private)
     * @param {string} ip - IP address to validate
     * @returns {boolean} True if IP is likely a public IP
     */
    static isValidPublicIP(ip) {
        if (!ip || typeof ip !== 'string') return false;

        // Remove any port numbers
        const cleanIP = ip.split(':')[0];

        // Basic IP format validation
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

        if (!ipv4Regex.test(cleanIP) && !ipv6Regex.test(cleanIP)) {
            return false;
        }

        // Check if it's not a private/local IP range
        const privateRanges = [
            /^127\./, // 127.0.0.0/8 - Loopback
            /^10\./, // 10.0.0.0/8 - Private
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 - Private
            /^192\.168\./, // 192.168.0.0/16 - Private
            /^169\.254\./, // 169.254.0.0/16 - Link-local
            /^::1$/, // IPv6 loopback
            /^fe80:/, // IPv6 link-local
            /^fc00:/, // IPv6 unique local
            /^fd00:/ // IPv6 unique local
        ];

        return !privateRanges.some(range => range.test(cleanIP));
    }

    /**
     * Delete all resolved security flags before a certain date
     * @param {Date} dateTime - Delete flags resolved before this date (defaults to start of today)
     * @returns {Promise<Object>} Result with deletedCount
     */
    static async deleteResolvedSecurityFlags(dateTime = new Date(new Date().setHours(0, 0, 0, 0))) {
        try {
            const result = await securityFlags.deleteMany({
                resolved: true,
                dateTime: { $lt: dateTime }
            });
            console.log(`[SECURITY FLAGS] Deleted ${result.deletedCount} resolved security flags from before ${dateTime.toISOString()}`);
            return result;
        } catch (error) {
            requestLogger.logInternalString("ERROR", `Error deleting resolved security flags: ${error}`);
            throw error;
        }
    }

    /**
     * Sanitize request headers by removing sensitive information
     * @param {Object} headers - Request headers
     * @returns {Object} Sanitized headers
     */
    static sanitizeHeaders(headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-access-key'];
        const sanitized = { ...headers };

        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Get security flags with filters
     * @param {Object} filters - Filters to apply
     * @param {number} [filters.riskLevel] - Filter by risk level
     * @param {string} [filters.ipAddress] - Filter by IP address
     * @param {boolean} [filters.resolved] - Filter by resolved status
     * @param {Date} [filters.dateFrom] - Filter from date
     * @param {Date} [filters.dateTo] - Filter to date
     * @param {string} [filters.descriptionFilter] - Text filter for description
     * @param {string} [filters.userFilter] - Text filter for user fields
     * @param {string} [filters.ipFilter] - Text filter for IP address
     * @param {string} [filters.fileFilter] - Text filter for file name
     * @param {string} [filters.additionalDataFilter] - Text filter for additional data
     * @param {string} [filters.dateTimeFilter] - Text filter for date/time
     * @param {number} [limit=50] - Limit results
     * @param {number} [skip=0] - Skip results for pagination
     * @returns {Promise<Array>} Array of security flags
     */
    static async getSecurityFlags(filters = {}, limit = 50, skip = 0) {
        try {
            const query = {};

            // Existing filters
            if (filters.riskLevel) {
                if (filters.minRiskLevel) {
                    query.riskLevel = { $gte: filters.riskLevel };
                } else {
                    query.riskLevel = filters.riskLevel;
                }
            }
            if (filters.ipAddress) query.ipAddress = filters.ipAddress;
            if (filters.resolved !== undefined) query.resolved = filters.resolved;
            if (filters.fileName) query.fileName = new RegExp(filters.fileName, 'i');

            // Text-based filters using regex for case-insensitive search
            if (filters.descriptionFilter) {
                query.description = new RegExp(filters.descriptionFilter, 'i');
            }

            if (filters.ipFilter) {
                query.ipAddress = new RegExp(filters.ipFilter, 'i');
            }

            if (filters.fileFilter) {
                query.fileName = new RegExp(filters.fileFilter, 'i');
            }

            if (filters.dateFrom || filters.dateTo) {
                query.dateTime = {};
                if (filters.dateFrom) query.dateTime.$gte = filters.dateFrom;
                if (filters.dateTo) query.dateTime.$lte = filters.dateTo;
            }

            let aggregationPipeline = [];

            // Build the initial match stage
            if (Object.keys(query).length > 0) {
                aggregationPipeline.push({ $match: query });
            }

            // Populate user references
            aggregationPipeline.push(
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userId'
                    }
                },
                {
                    $lookup: {
                        from: 'quartzforumaccounts',
                        localField: 'quartzUserId',
                        foreignField: '_id',
                        as: 'quartzUserId'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'resolvedBy',
                        foreignField: '_id',
                        as: 'resolvedBy'
                    }
                }
            );

            // Add fields to make searching easier
            aggregationPipeline.push({
                $addFields: {
                    userText: {
                        $concat: [
                            { $ifNull: [{ $arrayElemAt: ["$userId.username", 0] }, ""] },
                            " ",
                            { $ifNull: [{ $arrayElemAt: ["$quartzUserId.name", 0] }, ""] }
                        ]
                    },
                    additionalDataText: {
                        $function: {
                            body: function (obj) {
                                if (!obj || typeof obj !== 'object') return '';
                                return JSON.stringify(obj).toLowerCase();
                            },
                            args: ["$additionalData"],
                            lang: "js"
                        }
                    },
                    dateTimeText: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M:%S",
                            date: "$dateTime"
                        }
                    }
                }
            });

            // Apply text filters
            if (filters.userFilter) {
                aggregationPipeline.push({
                    $match: {
                        userText: new RegExp(filters.userFilter, 'i')
                    }
                });
            }

            if (filters.additionalDataFilter) {
                aggregationPipeline.push({
                    $match: {
                        additionalDataText: new RegExp(filters.additionalDataFilter, 'i')
                    }
                });
            }

            if (filters.dateTimeFilter) {
                aggregationPipeline.push({
                    $match: {
                        dateTimeText: new RegExp(filters.dateTimeFilter, 'i')
                    }
                });
            }

            // Sort, skip, and limit
            aggregationPipeline.push(
                { $sort: { dateTime: -1 } },
                { $skip: skip },
                { $limit: limit }
            );

            // Clean up the output
            aggregationPipeline.push({
                $project: {
                    ipAddress: 1,
                    riskLevel: 1,
                    dateTime: 1,
                    description: 1,
                    fileName: 1,
                    userAgent: 1,
                    sessionToken: 1,
                    userId: { $arrayElemAt: ["$userId", 0] },
                    quartzUserId: { $arrayElemAt: ["$quartzUserId", 0] },
                    implementationKey: 1,
                    requestMethod: 1,
                    requestUrl: 1,
                    requestHeaders: 1,
                    additionalData: 1,
                    resolved: 1,
                    resolvedBy: { $arrayElemAt: ["$resolvedBy", 0] },
                    resolvedAt: 1,
                    resolvedNotes: 1
                }
            });

            return await securityFlags.aggregate(aggregationPipeline);
        } catch (error) {
            requestLogger.logInternalString("ERROR", `Error getting security flags: ${error}`);
            throw error;
        }
    }

    /**
     * Mark a security flag as resolved
     * @param {string} flagId - Security flag ID
     * @param {string} resolvedByUserId - ID of user resolving the flag
     * @param {string} [resolvedNotes] - Optional resolution notes
     * @returns {Promise<Object>} Updated security flag
     */
    static async resolveSecurityFlag(flagId, resolvedByUserId, resolvedNotes = '') {
        try {
            return await securityFlags.findByIdAndUpdate(
                flagId,
                {
                    resolved: true,
                    resolvedBy: resolvedByUserId,
                    resolvedAt: new Date(),
                    resolvedNotes
                },
                { new: true }
            );
        } catch (error) {
            requestLogger.logInternalString("ERROR", `Error resolving security flag: ${error}`);
            throw error;
        }
    }

    /**
     * Get security statistics
     * @param {Date} [dateFrom] - Start date for statistics
     * @param {Date} [dateTo] - End date for statistics
     * @returns {Promise<Object>} Security statistics
     */
    static async getSecurityStats(dateFrom, dateTo) {
        try {
            const matchStage = {};
            if (dateFrom || dateTo) {
                matchStage.dateTime = {};
                if (dateFrom) matchStage.dateTime.$gte = dateFrom;
                if (dateTo) matchStage.dateTime.$lte = dateTo;
            }

            const stats = await securityFlags.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalFlags: { $sum: 1 },
                        resolvedFlags: { $sum: { $cond: ['$resolved', 1, 0] } },
                        unresolvedFlags: { $sum: { $cond: ['$resolved', 0, 1] } },
                        riskLevelCounts: {
                            $push: '$riskLevel'
                        },
                        uniqueIPs: { $addToSet: '$ipAddress' }
                    }
                },
                {
                    $project: {
                        totalFlags: 1,
                        resolvedFlags: 1,
                        unresolvedFlags: 1,
                        uniqueIPCount: { $size: '$uniqueIPs' },
                        riskLevel1: {
                            $size: { $filter: { input: '$riskLevelCounts', cond: { $eq: ['$$this', 1] } } }
                        },
                        riskLevel2: {
                            $size: { $filter: { input: '$riskLevelCounts', cond: { $eq: ['$$this', 2] } } }
                        },
                        riskLevel3: {
                            $size: { $filter: { input: '$riskLevelCounts', cond: { $eq: ['$$this', 3] } } }
                        },
                        riskLevel4: {
                            $size: { $filter: { input: '$riskLevelCounts', cond: { $eq: ['$$this', 4] } } }
                        },
                        riskLevel5: {
                            $size: { $filter: { input: '$riskLevelCounts', cond: { $eq: ['$$this', 5] } } }
                        }
                    }
                }
            ]);

            return stats[0] || {
                totalFlags: 0,
                resolvedFlags: 0,
                unresolvedFlags: 0,
                uniqueIPCount: 0,
                riskLevel1: 0,
                riskLevel2: 0,
                riskLevel3: 0,
                riskLevel4: 0,
                riskLevel5: 0
            };
        } catch (error) {
            console.error('Error getting security statistics:', error);
            throw error;
        }
    }
}

module.exports = {
    SecurityFlagHandler
};