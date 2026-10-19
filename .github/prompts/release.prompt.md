---
description: Build the site and produce the cPanel upload zip
mode: agent
agent: agent
---
Make a release of this site.

1. Run `npx tsc --noEmit`. If there are errors, fix them (smallest change that is correct) and run it again.
2. Run `npm run release -- --fast` in the terminal and wait for it to finish.
3. If it fails, find the FIRST error in the output, explain the cause in one sentence, fix it, and run the release again. Don't change `.env` or any secret, and don't disable checks to get past an error.
4. When it succeeds, tell me the zip's path and size, then give me the cPanel steps in 4 short lines. Remind me if this release changed the database schema and I need to run SQL first.

Don't commit, push, or deploy anything.
