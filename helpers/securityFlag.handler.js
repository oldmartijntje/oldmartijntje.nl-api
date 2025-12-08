const { securityFlags } = require('../database.js');

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
            console.error('Error creating security flag:', error);
            throw error;
        }
    }

    /**
     * Extract IP address from request object
     * @param {Object} req - Express request object
     * @returns {string} IP address
     */
    static extractIpAddress(req) {
        return req.ip ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            'unknown';
    }

    /**
     * Sanitize headers to remove sensitive information
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
     * @param {number} [limit=50] - Limit results
     * @param {number} [skip=0] - Skip results for pagination
     * @returns {Promise<Array>} Array of security flags
     */
    static async getSecurityFlags(filters = {}, limit = 50, skip = 0) {
        try {
            const query = {};

            if (filters.riskLevel) query.riskLevel = filters.riskLevel;
            if (filters.ipAddress) query.ipAddress = filters.ipAddress;
            if (filters.resolved !== undefined) query.resolved = filters.resolved;
            if (filters.fileName) query.fileName = new RegExp(filters.fileName, 'i');

            if (filters.dateFrom || filters.dateTo) {
                query.dateTime = {};
                if (filters.dateFrom) query.dateTime.$gte = filters.dateFrom;
                if (filters.dateTo) query.dateTime.$lte = filters.dateTo;
            }

            return await securityFlags
                .find(query)
                .sort({ dateTime: -1 })
                .limit(limit)
                .skip(skip)
                .populate('userId', 'username')
                .populate('quartzUserId', 'name')
                .populate('resolvedBy', 'username');
        } catch (error) {
            console.error('Error getting security flags:', error);
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
            console.error('Error resolving security flag:', error);
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