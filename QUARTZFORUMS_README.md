# QuartzForums API Implementation

## Overview

The QuartzForums API has been successfully integrated into your existing Node.js/Express/MongoDB application. This implementation provides a complete forum system that can be embedded across multiple websites using implementation keys.

## 🚀 Quick Start

### 1. Setup Implementation Keys
Run this once to create test implementation keys:
```bash
node setup-quartzforums.js
```

### 2. Start Your Server
```bash
npm run dev
```

### 3. Test the API
```bash
node validate-quartzforums.js  # Basic validation
node test-quartzforums.js      # Full API test (requires Node.js 18+)
```

## 📊 Database Collections

The following collections have been added to your MongoDB:

- **ImplementationKey** - Manages website/domain access
- **QuartzForumAccount** - User accounts for the forum system
- **QuartzForumForum** - Forum instances (identified by implementationKey + subpage)
- **QuartzForumMessage** - Individual messages in forums

## 🛠 API Endpoints

All endpoints are prefixed with `/forums/` in your application.

### Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/account/register` | Create new account |
| POST | `/api/account/login` | Login to existing account |
| POST | `/api/account/reset-access-key` | Generate new access key |
| DELETE | `/api/account` | Delete account |
| GET | `/api/account/:userId` | Get user profile |

### Message Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/message` | Post message (creates forum if needed) |
| DELETE | `/api/message/:messageId` | Delete message |

### Forum Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forum` | Get all messages in a forum |
| GET | `/api/forums/recent` | Get 25 most recently updated forums |
| GET | `/api/forums` | Get all forums (with filtering) |

## 🔒 Authentication

### Access Keys
- Used for write operations (posting/deleting messages)
- Sent via `X-Access-Key` header
- Generated during account creation/login

### Implementation Keys
- Identifies which website the forum belongs to
- Required for all forum operations
- Prevents unauthorized forum access

## ⚡ Key Features Implemented

### ✅ Limbo System
- Users posting profanity (containing "fuck") are automatically put in limbo
- Limbo users can see all messages
- Non-limbo users cannot see limbo messages
- Maintains content moderation automatically

### ✅ Soft Deletion
- Messages are never fully deleted
- `accountId` set to `null` when deleted
- Content preserved for moderation/audit purposes

### ✅ Auto-Forum Creation
- Forums created automatically when first message posted
- No need to pre-create forum structures

### ✅ Cross-Domain Support
- Multiple websites can use same API
- Implementation keys isolate forums by domain
- Disabled keys prevent access

## 🧪 Testing

### Example API Usage

```javascript
// 1. Register Account
const response = await fetch('http://localhost:3000/forums/api/account/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
    })
});
const { accessKey, userId } = await response.json();

// 2. Post Message
await fetch('http://localhost:3000/forums/api/message', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': accessKey
    },
    body: JSON.stringify({
        implementationKey: 'test-key-123',
        subpage: '/my-forum',
        content: 'Hello, world!'
    })
});

// 3. Get Forum Messages
const forumResponse = await fetch(
    'http://localhost:3000/forums/api/forum?implementationKey=test-key-123&subpage=/my-forum'
);
const forum = await forumResponse.json();
```

## 🔧 Configuration

### Environment Variables
Your existing `.env` file works as-is:
- `DB_URL` - MongoDB connection string
- `API_PORT` - Server port

### Implementation Key Management
Add new domains by creating `ImplementationKey` documents:
```javascript
{
    implementationKey: 'unique-key-for-site',
    domain: 'docs.example.com',
    disabled: false
}
```

## 📁 Files Added/Modified

### New Files
- `schemas/implementationKey.schema.js`
- `schemas/quartzForumAccount.schema.js`
- `schemas/quartzForumForum.schema.js`
- `schemas/quartzForumMessage.schema.js`
- `authentication/quartzforum.auth.js`
- `setup-quartzforums.js`
- `validate-quartzforums.js`
- `test-quartzforums.js`

### Modified Files
- `database.js` - Added QuartzForums schemas and models
- `controller/quartzforums.controller.js` - Complete controller implementation
- `routing/quartzforums.routes.js` - All API routes
- `server.js` - Updated imports for new models

## 🛡 Security Features

- Password hashing with bcrypt
- Access key authentication
- Implementation key validation
- Rate limiting (via your existing middleware)
- Input validation and sanitization

## 🔄 Next Steps

1. **Add more implementation keys** for your actual domains
2. **Customize the frontend** to integrate with these APIs
3. **Add admin endpoints** for managing implementation keys
4. **Implement rate limiting** specific to QuartzForums if needed
5. **Add email notifications** or other features as required

## 📞 Support

The implementation follows the exact specification from your `quartzforums copy.md` file. All endpoints return the specified response formats and handle the business logic as documented (limbo system, soft deletion, auto-forum creation, etc.).

Your QuartzForums API is now ready for production use! 🎉