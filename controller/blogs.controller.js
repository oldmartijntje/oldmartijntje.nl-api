const { blogs } = require('../database.js');
const settings = require('../settings.json');
const { SecurityFlagHandler } = require('../helpers/securityFlag.handler.js');
const { requestLogger } = require('../helpers/requestLogger.js');

function parseBoolean(value) {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    return undefined;
}

function parseDateValue(value) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return undefined;
    }

    return parsedDate;
}

function normalizeBlogIdentifier(value) {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
        return undefined;
    }

    if (!/^[a-z0-9-]+$/.test(normalized)) {
        return undefined;
    }

    if (normalized !== normalized.toLowerCase()) {
        return undefined;
    }

    return normalized;
}

async function getBlogs(req, res) {
    try {
        const limit = Number.parseInt(req.query.limit ?? settings.defaultAmountToGet, 10);
        const skip = Number.parseInt(req.query.skip ?? 0, 10);
        const showHiddenRequested = parseBoolean(req.query.hidden) ?? false;
        const showHidden = showHiddenRequested && req.blogCanSeeHidden === true;

        if (Number.isNaN(limit) || Number.isNaN(skip)) {
            return res.status(400).json({
                success: false,
                message: 'limit and skip must be numbers'
            });
        }

        const query = {};
        if (!showHidden) {
            query.hidden = false;
        }

        const [items, total] = await Promise.all([
            blogs.find(query).sort({ pubDate: -1 }).skip(skip).limit(limit),
            blogs.countDocuments(query)
        ]);

        return res.json({
            success: true,
            data: items,
            pagination: {
                limit,
                skip,
                total
            }
        });
    } catch (error) {
        requestLogger.logInternalString('ERROR', `Error getting blogs: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving blogs'
        });
    }
}

async function getBlog(req, res) {
    try {
        const identifierOrId = typeof req.params.blogIdentifier === 'string' ? req.params.blogIdentifier.trim() : '';
        const blogIdentifier = normalizeBlogIdentifier(identifierOrId);
        const isObjectId = /^[a-fA-F0-9]{24}$/.test(identifierOrId);
        const showHiddenRequested = parseBoolean(req.query.hidden) ?? false;
        const showHidden = showHiddenRequested && req.blogCanSeeHidden === true;

        if (!blogIdentifier && !isObjectId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blogIdentifier or _id'
            });
        }

        const query = {
            $or: []
        };

        if (blogIdentifier) {
            query.$or.push({ blogIdentifier });
        }
        if (isObjectId) {
            query.$or.push({ _id: identifierOrId });
        }

        if (!showHidden) {
            query.hidden = false;
        }

        const blog = await blogs.findOne(query);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        return res.json({
            success: true,
            data: blog
        });
    } catch (error) {
        requestLogger.logInternalString('ERROR', `Error getting blog: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving blog'
        });
    }
}

async function createBlog(req, res) {
    try {
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
        const rawBlogIdentifier = req.body.blogIdentifier;
        const blogIdentifier = normalizeBlogIdentifier(rawBlogIdentifier);
        const hidden = parseBoolean(req.body.hidden) ?? false;

        const pubDate = parseDateValue(req.body.pubDate) ?? new Date();
        const editDate = parseDateValue(req.body.editDate) ?? new Date();

        if (!title || !description || rawBlogIdentifier === undefined || rawBlogIdentifier === null || rawBlogIdentifier === '') {
            return res.status(400).json({
                success: false,
                message: 'title, description, and blogIdentifier are required'
            });
        }

        if (!blogIdentifier) {
            return res.status(400).json({
                success: false,
                message: 'blogIdentifier may only contain lowercase letters, numbers, and dashes'
            });
        }

        const existingBlog = await blogs.findOne({ blogIdentifier });
        if (existingBlog) {
            return res.status(409).json({
                success: false,
                message: 'blogIdentifier already exists'
            });
        }

        const createdBlog = await blogs.create({
            title,
            description,
            blogIdentifier,
            pubDate,
            editDate,
            hidden
        });

        return res.status(201).json({
            success: true,
            data: createdBlog,
            message: 'Blog created successfully'
        });
    } catch (error) {
        requestLogger.logInternalString('ERROR', `Error creating blog: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'Error creating blog'
        });
    }
}

async function updateBlog(req, res) {
    try {
        const id = req.body._id;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: '_id is required'
            });
        }

        if (req.body.blogIdentifier !== undefined) {
            return res.status(400).json({
                success: false,
                message: 'blogIdentifier cannot be edited'
            });
        }

        const updatePayload = {};

        if (req.body.title !== undefined) {
            const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
            if (!title) {
                return res.status(400).json({
                    success: false,
                    message: 'title cannot be empty'
                });
            }
            updatePayload.title = title;
        }

        if (req.body.description !== undefined) {
            const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
            if (!description) {
                return res.status(400).json({
                    success: false,
                    message: 'description cannot be empty'
                });
            }
            updatePayload.description = description;
        }

        if (req.body.hidden !== undefined) {
            const hidden = parseBoolean(req.body.hidden);
            if (hidden === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'hidden must be a boolean'
                });
            }
            updatePayload.hidden = hidden;
        }

        if (req.body.pubDate !== undefined) {
            const pubDate = parseDateValue(req.body.pubDate);
            if (!pubDate) {
                return res.status(400).json({
                    success: false,
                    message: 'pubDate must be a valid date'
                });
            }
            updatePayload.pubDate = pubDate;
        }

        if (req.body.editDate !== undefined) {
            const editDate = parseDateValue(req.body.editDate);
            if (!editDate) {
                return res.status(400).json({
                    success: false,
                    message: 'editDate must be a valid date'
                });
            }
            updatePayload.editDate = editDate;
        } else {
            updatePayload.editDate = new Date();
        }

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No updatable fields provided'
            });
        }

        const result = await blogs.updateOne({ _id: { $eq: id } }, { $set: updatePayload });
        if (!result || result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        return res.json({
            success: true,
            message: 'Blog updated successfully'
        });
    } catch (error) {
        requestLogger.logInternalString('ERROR', `Error updating blog: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'Error updating blog'
        });
    }
}

async function deleteBlog(req, res) {
    try {
        const id = req.query.id || req.body._id;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'id is required'
            });
        }

        const result = await blogs.deleteOne({ _id: { $eq: id } });
        if (!result || result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        return res.json({
            success: true,
            message: 'Blog deleted successfully'
        });
    } catch (error) {
        requestLogger.logInternalString('ERROR', `Error deleting blog: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'Error deleting blog'
        });
    }
}

async function logDeniedBlogAction(req, user, action, blogData) {
    try {
        await SecurityFlagHandler.createSecurityFlag({
            req,
            riskLevel: 3,
            description: `User attempted blog ${action} with insufficient clearance (level ${user.clearanceLevel})`,
            fileName: 'blogs.controller.js',
            userId: user._id,
            additionalData: {
                username: user.username,
                userClearanceLevel: user.clearanceLevel,
                requiredClearanceLevel: 5,
                attemptedAction: action,
                blogIdentifier: blogData.blogIdentifier,
                blogId: blogData._id,
                endpoint: '/getData/blogs',
                possibleFrontendBypass: true
            }
        });
    } catch (flagError) {
        requestLogger.failedSecurityFlag(flagError);
    }
}

module.exports = {
    getBlogs,
    getBlog,
    createBlog,
    updateBlog,
    deleteBlog,
    logDeniedBlogAction
};