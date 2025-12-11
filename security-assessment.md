# Assessment

I have noticed thanks to [aikido.dev](aikido.dev) that this website has quite a few security risks.

## npm Dependency Vulnerabilities

Found 7 vulnerabilities (4 low, 3 high) in npm dependencies:

### Fixed Vulnerabilities:

1. **body-parser < 1.20.3** (High Severity)
   - Vulnerable to denial of service when url encoding is enabled
   - Advisory: GHSA-qwcr-r2fm-qrc7
   - Fixed by updating to body-parser ≥1.20.3

2. **brace-expansion 1.0.0 - 1.1.11** (Low Severity)
   - Regular Expression Denial of Service (ReDoS) vulnerability
   - Advisory: GHSA-v6h2-p8h4-qcjw
   - Fixed by updating to brace-expansion >1.1.11

3. **cookie < 0.7.0** (Low Severity)
   - Accepts cookie name, path, and domain with out of bounds characters
   - Advisory: GHSA-pxg6-pf52-xh8x
   - Fixed by updating to cookie ≥0.7.0

4. **path-to-regexp ≤ 0.1.11** (High Severity)
   - Outputs backtracking regular expressions (ReDoS)
   - Advisory: GHSA-9wv6-86v2-598j, GHSA-rhx6-c78j-4q9w
   - Fixed by updating to path-to-regexp >0.1.11

5. **send < 0.19.0** (Low Severity)
   - Vulnerable to template injection that can lead to XSS
   - Advisory: GHSA-m6fv-jmcg-4jfg
   - Fixed by updating to send ≥0.19.0

6. **serve-static ≤ 1.16.0** (Low Severity)
   - Depends on vulnerable versions of send
   - Fixed by updating serve-static dependency

7. **express ≤ 4.21.0** (cascading vulnerabilities)
   - Depends on vulnerable versions of body-parser, cookie, path-to-regexp, send, and serve-static
   - Fixed by updating express and all dependencies

**Resolution:** All vulnerabilities resolved by running `npm audit fix` on December 11, 2025. Updated 20 packages, added 16 packages, removed 5 packages. Current status: 0 vulnerabilities.

## NoSQL injection attack possible

Effected: 31 times.

**TL;DR**

Query injection attacks are possible if users can pass objects instead of strings to query functions such as findOne.

By injecting query operators attackers can control the behavior of the query, allowing them to bypass access controls and extract unauthorized data. Consider the attack payload `?user_id[$ne]=5`: if the user_id query parameter is passed to the query function without validation or casting its type, an attacker can pass {$ne: 5} instead of an integer to the query. {$ne: 5} uses the 'not equal to' operator to access data of other users.

While this vulnerability is known as NoSQL injection, relational databases (mysql, postgres) are also vulnerable to this attack if the query library offers a NoSQL-like API and supports string-typed query operators. Examples include prisma and sequelize versions prior to 4.12.0.

**Fix:**

User input should be validated (e.g. with class-validator, zod or joi) or sanitized (e.g. with mongo-sanitize). Alternatively cast request parameters to their expected type or use the $eq operator to block object injection. You can also Autofix all instances of NoSQL injection by installing Zen for Node.js.

>this has now been fixed everywhere (i think, will recheck later)

## CVE-2025-23061

**TL;DR**

This is the package maintainer's summary.

Mongoose before 8.9.5 can improperly use a nested $where filter with a populate() match, leading to search injection. NOTE: this issue exists because of an incomplete fix for CVE-2024-53900.The worst case impact for these vulnerabilities can be "Attacker can inject own code to run".

> fixed by updating to 9.0.1

## Content Security Policy (CSP) header not set

**TL;DR**

Content Security Policy (CSP) is a first line of defense against common attacks including Cross Site Scripting (XSS) and data injection attacks. These attacks are used for everything from data theft via account takeovers to site defacement or distribution of malware. CSP config allows you to declare what content can be loaded and executed via a standard HTTP header. You can whitelist JavaScript, CSS, HTML frames, fonts, images and embeddable objects such as Java applets, ActiveX, audio and video files.

> I have assessed this issue by installing the helmet package and adding a CSP configuration