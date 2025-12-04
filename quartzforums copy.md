# QuartzForums API Specification

## Overview

QuartzForums is a forum system implemented as a Quartz plugin. It provides a REST API for managing forums, user accounts, and messages across multiple host websites.

---

## Authentication

### Access Key
- A unique token assigned to each user account.
- Used to authenticate write operations (posting messages).
- Can be reset by the user.

### Implementation Key
- A unique token assigned to each host website.
- Identifies which website/domain the forum belongs to.
- Example: Key `lkjajadfaf` maps to `docs.oldmartijntje.nl`.

---

## Database Schemas

### `ImplementationKey`

| Field              | Type      | Description                                      |
|--------------------|-----------|--------------------------------------------------|
| `_id`              | ObjectId  | MongoDB auto-generated ID                        |
| `implementationKey`| String    | Unique key identifying the host website          |
| `domain`           | String    | The domain this key maps to (e.g., `docs.oldmartijntje.nl`) |
| `disabled`         | Boolean   | If `true`, all API calls using this key are rejected. Default: `false` |

### `QuartzForumAccount`

| Field           | Type      | Description                                                                 |
|-----------------|-----------|-----------------------------------------------------------------------------|
| `_id`           | ObjectId  | MongoDB auto-generated ID (user ID)                                         |
| `name`          | String    | Unique username                                                             |
| `password`      | String    | Bcrypt-hashed password                                                      |
| `accessKey`     | String    | Unique token for authenticating API write operations                        |
| `profileDesign` | Object    | Reserved for future use. Default: `{}`                                      |
| `lastUsage`     | Date      | Updated on every authenticated API call (login or accessKey usage)          |
| `limbo`         | Boolean   | If `true`, user's messages are only visible to other limbo users. Default: `false` |

### `QuartzForumForum`

| Field              | Type      | Description                                                              |
|--------------------|-----------|--------------------------------------------------------------------------|
| `_id`              | ObjectId  | MongoDB auto-generated ID (forum ID)                                     |
| `implementationKey`| String    | Foreign key to `ImplementationKey.implementationKey`                     |
| `subpage`          | String    | The path/slug of the forum (e.g., `/cool-forum`)                         |
| `lastPush`         | Date      | Updated whenever a new message is added to this forum                    |

**Unique Constraint:** `(implementationKey, subpage)` together form the unique identifier for a forum.

### `QuartzForumMessage`

| Field      | Type            | Description                                                                |
|------------|-----------------|----------------------------------------------------------------------------|
| `_id`      | ObjectId        | MongoDB auto-generated ID (message ID)                                     |
| `forumId`  | ObjectId        | Foreign key to `QuartzForumForum._id`                                      |
| `accountId`| ObjectId \| null| Foreign key to `QuartzForumAccount._id`. Set to `null` if user deletes account or message |
| `content`  | String          | The text content of the message                                            |
| `limbo`    | Boolean         | Inherits from poster's `limbo` status at time of posting. Default: `false` |
| `createdAt`| Date            | Timestamp when the message was created                                     |

---

## API Endpoints

### Account Management

#### `POST /api/account/register`
Create a new account.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (201):**
```json
{
  "userId": "ObjectId",
  "username": "string",
  "accessKey": "string"
}
```

**Errors:**
- `400` - Username already exists
- `400` - Invalid username/password format

---

#### `POST /api/account/login`
Log into an existing account.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "userId": "ObjectId",
  "username": "string",
  "accessKey": "string"
}
```

**Side Effects:**
- Updates `lastUsage` on the account.

**Errors:**
- `401` - Invalid credentials

---

#### `POST /api/account/reset-access-key`
Generate a new access key, invalidating the old one.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "accessKey": "string (new key)"
}
```

**Side Effects:**
- Updates `lastUsage` on the account.

**Errors:**
- `401` - Invalid credentials

---

#### `DELETE /api/account`
Disable/delete account. Sets all user's messages' `accountId` to `null`.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

**Side Effects:**
- All messages where `accountId` matches this user are updated: `accountId = null`.
- The account document is deleted.

**Errors:**
- `401` - Invalid credentials

---

#### `GET /api/account/:userId`
View a user's public profile.

**Response (200):**
```json
{
  "userId": "ObjectId",
  "username": "string",
  "profileDesign": {},
  "forums": [
    {
      "forumId": "ObjectId",
      "implementationKey": "string",
      "subpage": "string",
      "messageCount": "number"
    }
  ]
}
```

**Notes:**
- `forums` lists all forums where this user has posted at least one message.
- If requester is not in limbo, exclude forums/messages where `limbo: true`.

**Errors:**
- `404` - User not found

---

### Forum & Message Management

#### `POST /api/message`
Post a message to a forum. Creates the forum if it doesn't exist.

**Request Headers:**
```
X-Access-Key: <accessKey>
```

**Request Body:**
```json
{
  "implementationKey": "string",
  "subpage": "string",
  "content": "string"
}
```

**Response (201):**
```json
{
  "messageId": "ObjectId",
  "forumId": "ObjectId",
  "content": "string",
  "createdAt": "Date"
}
```

**Side Effects:**
1. Validate `implementationKey` exists and is not disabled → reject if invalid.
2. Find or create `QuartzForumForum` with matching `(implementationKey, subpage)`.
3. Update forum's `lastPush` to current timestamp.
4. Update user's `lastUsage` to current timestamp.
5. If `content` contains the word `"fuck"` (case-insensitive), set user's `limbo` to `true`.
6. Message inherits poster's current `limbo` status.

**Errors:**
- `401` - Invalid or missing access key
- `403` - Implementation key is disabled or doesn't exist
- `400` - Missing required fields

---

#### `DELETE /api/message/:messageId`
Delete a message. Sets `accountId` to `null` (content is preserved).

**Request Headers:**
```
X-Access-Key: <accessKey>
```

**Response (200):**
```json
{
  "message": "Message deleted successfully"
}
```

**Side Effects:**
- Sets `accountId` to `null` on the message (does not delete the document).
- Updates user's `lastUsage`.

**Errors:**
- `401` - Invalid or missing access key
- `403` - User does not own this message
- `404` - Message not found

---

#### `GET /api/forum`
Get all messages for a specific forum.

**Query Parameters:**
- `implementationKey` (required): string
- `subpage` (required): string
- `requesterAccessKey` (optional): string — if provided and user is in limbo, include limbo messages

**Response (200):**
```json
{
  "forumId": "ObjectId",
  "implementationKey": "string",
  "subpage": "string",
  "lastPush": "Date",
  "messages": [
    {
      "messageId": "ObjectId",
      "accountId": "ObjectId | null",
      "username": "string | null",
      "content": "string",
      "limbo": "boolean",
      "createdAt": "Date"
    }
  ]
}
```

**Notes:**
- Messages are sorted by `createdAt` ascending.
- If `requesterAccessKey` is not provided or user is not in limbo, exclude messages where `limbo: true`.
- `username` is `null` if `accountId` is `null`.

**Errors:**
- `403` - Implementation key is disabled or doesn't exist
- `404` - Forum not found

---

#### `GET /api/forums/recent`
Get the 25 most recently updated forums.

**Query Parameters:**
- `requesterAccessKey` (optional): string

**Response (200):**
```json
{
  "forums": [
    {
      "forumId": "ObjectId",
      "implementationKey": "string",
      "subpage": "string",
      "lastPush": "Date"
    }
  ]
}
```

**Notes:**
- Sorted by `lastPush` descending.
- Excludes forums with disabled implementation keys.
- Limited to 25 results.

---

#### `GET /api/forums`
Get all forums (with optional filtering).

**Query Parameters:**
- `implementationKey` (optional): string — filter by implementation key
- `subpage` (optional): string — filter by subpage (partial match)
- `limit` (optional): number — max results (default: 50)
- `offset` (optional): number — pagination offset (default: 0)

**Response (200):**
```json
{
  "total": "number",
  "forums": [
    {
      "forumId": "ObjectId",
      "implementationKey": "string",
      "subpage": "string",
      "lastPush": "Date"
    }
  ]
}
```

**Notes:**
- Excludes forums with disabled implementation keys.

---

## Business Logic Summary

| Rule | Description |
|------|-------------|
| **Limbo Trigger** | If a user posts a message containing `"fuck"` (case-insensitive), their `limbo` flag is set to `true`. |
| **Limbo Visibility** | Users in limbo can see all messages. Users not in limbo cannot see messages where `limbo: true`. |
| **Message Deletion** | Deleting a message sets `accountId` to `null`; content is preserved. |
| **Account Deletion** | Deleting an account sets `accountId` to `null` on all their messages; account document is deleted. |
| **Forum Creation** | Forums are created implicitly when the first message is posted to a new `(implementationKey, subpage)` combination. |
| **Implementation Key Validation** | All write operations must validate that the `implementationKey` exists and is not disabled. |

---

Does this cover everything you need, or would you like me to add more detail to any section?