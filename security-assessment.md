# Assesment

I have noticed thanks to [aikido.dev](aikido.dev) that this website has quite a few security risks.

## NoSQL injection attack possible

Effected: 31 times.

**TL;DR**

Query injection attacks are possible if users can pass objects instead of strings to query functions such as findOne.

By injecting query operators attackers can control the behavior of the query, allowing them to bypass access controls and extract unauthorized data. Consider the attack payload `?user_id[$ne]=5`: if the user_id query parameter is passed to the query function without validation or casting its type, an attacker can pass {$ne: 5} instead of an integer to the query. {$ne: 5} uses the 'not equal to' operator to access data of other users.

While this vulnerability is known as NoSQL injection, relational databases (mysql, postgres) are also vulnerable to this attack if the query library offers a NoSQL-like API and supports string-typed query operators. Examples include prisma and sequelize versions prior to 4.12.0.

**Fix:**

User input should be validated (e.g. with class-validator, zod or joi) or sanitized (e.g. with mongo-sanitize). Alternatively cast request parameters to their expected type or use the $eq operator to block object injection. You can also Autofix all instances of NoSQL injection by installing Zen for Node.js.

