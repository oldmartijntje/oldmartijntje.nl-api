const { SecurityFlagHandler } = require('../helpers/securityFlag.handler.js');

/**
 * Get security flags with filtering options
 */
async function getSecurityFlags(req, res) {
    try {
        const {
            riskLevel,
            minRiskLevel,
            ipAddress,
            resolved,
            dateFrom,
            dateTo,
            fileName,
            // Text filtering parameters
            descriptionFilter,
            userFilter,
            ipFilter,
            fileFilter,
            additionalDataFilter,
            dateTimeFilter,
            limit = 50,
            skip = 0
        } = req.query;

        const filters = {};
        if (riskLevel) filters.riskLevel = parseInt(riskLevel);
        if (minRiskLevel !== undefined) filters.minRiskLevel = minRiskLevel === 'true';
        if (ipAddress) filters.ipAddress = ipAddress;
        if (resolved !== undefined) filters.resolved = resolved === 'true';
        if (fileName) filters.fileName = fileName;
        if (dateFrom) filters.dateFrom = new Date(dateFrom);
        if (dateTo) filters.dateTo = new Date(dateTo);

        // Add text filtering
        if (descriptionFilter) filters.descriptionFilter = descriptionFilter;
        if (userFilter) filters.userFilter = userFilter;
        if (ipFilter) filters.ipFilter = ipFilter;
        if (fileFilter) filters.fileFilter = fileFilter;
        if (additionalDataFilter) filters.additionalDataFilter = additionalDataFilter;
        if (dateTimeFilter) filters.dateTimeFilter = dateTimeFilter;

        const flags = await SecurityFlagHandler.getSecurityFlags(
            filters,
            parseInt(limit),
            parseInt(skip)
        );

        res.json({
            success: true,
            data: flags,
            pagination: {
                limit: parseInt(limit),
                skip: parseInt(skip)
            },
            appliedFilters: filters
        });
    } catch (error) {
        console.error('Error getting security flags:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving security flags'
        });
    }
}

/**
 * Get security statistics
 */
async function getSecurityStats(req, res) {
    try {
        const { dateFrom, dateTo } = req.query;

        const filters = {};
        if (dateFrom) filters.dateFrom = new Date(dateFrom);
        if (dateTo) filters.dateTo = new Date(dateTo);

        const stats = await SecurityFlagHandler.getSecurityStats(
            filters.dateFrom,
            filters.dateTo
        );

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting security statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving security statistics'
        });
    }
}

/**
 * Resolve a security flag
 */
async function resolveSecurityFlag(req, res) {
    try {
        const { flagId } = req.params;
        const { resolvedNotes } = req.body;

        // Get the resolving user's ID from the authenticated session
        const resolvedByUserId = req.resolvedByUserId;

        if (!resolvedByUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required to resolve security flags'
            });
        }

        const updatedFlag = await SecurityFlagHandler.resolveSecurityFlag(
            flagId,
            resolvedByUserId,
            resolvedNotes
        );

        if (!updatedFlag) {
            return res.status(404).json({
                success: false,
                message: 'Security flag not found'
            });
        }

        res.json({
            success: true,
            data: updatedFlag,
            message: 'Security flag resolved successfully'
        });
    } catch (error) {
        console.error('Error resolving security flag:', error);
        res.status(500).json({
            success: false,
            message: 'Error resolving security flag'
        });
    }
}

/**
 * Create a manual security flag (for testing or manual reporting)
 */
async function createSecurityFlag(req, res) {
    try {
        const {
            ipAddress,
            riskLevel,
            description,
            fileName = 'manual-creation',
            userId,
            quartzUserId,
            implementationKey,
            additionalData = {}
        } = req.body;

        if (!ipAddress || !riskLevel || !description) {
            return res.status(400).json({
                success: false,
                message: 'IP address, risk level, and description are required'
            });
        }

        if (riskLevel < 1 || riskLevel > 5) {
            return res.status(400).json({
                success: false,
                message: 'Risk level must be between 1 and 5'
            });
        }

        const flag = await SecurityFlagHandler.createSecurityFlag({
            ipAddress,
            riskLevel,
            description,
            fileName,
            userId,
            quartzUserId,
            implementationKey,
            additionalData
        });

        res.status(201).json({
            success: true,
            data: flag,
            message: 'Security flag created successfully'
        });
    } catch (error) {
        console.error('Error creating security flag:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating security flag'
        });
    }
}

/**
 * Delete all resolved security flags
 */
async function deleteResolvedSecurityFlags(req, res) {
    try {
        const { dateTime } = req.body;

        // If dateTime is not provided, default to start of today (everything before today)
        const cutoffDate = dateTime ? new Date(dateTime) : new Date(new Date().setHours(0, 0, 0, 0));

        const result = await SecurityFlagHandler.deleteResolvedSecurityFlags(cutoffDate);

        res.json({
            success: true,
            data: {
                deletedCount: result.deletedCount,
                deletedBefore: cutoffDate
            },
            message: `Successfully deleted ${result.deletedCount} resolved security flag(s) from before ${cutoffDate.toISOString()}`
        });
    } catch (error) {
        console.error('Error deleting resolved security flags:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting resolved security flags'
        });
    }
}

module.exports = {
    getSecurityFlags,
    getSecurityStats,
    resolveSecurityFlag,
    createSecurityFlag,
    deleteResolvedSecurityFlags
};