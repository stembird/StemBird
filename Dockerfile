# ============================================================
# CareerSasa background worker image
# Used by Railway to run the standalone scrape worker.
#
# Vercel builds the Next.js app with its own pipeline and
# ignores this file — this Dockerfile only matters on Railway.
# ============================================================

FROM node:20-slim

WORKDIR /app

# Install all deps first (better layer caching).
# npm ci installs devDependencies too (tsx is required at runtime
# to execute the TypeScript worker sources).
COPY package.json package-lock.json ./
RUN npm ci

# Copy the whole repo — the worker imports shared code from src/lib/.
COPY . .

# Default: run the node-cron scheduler (discover + process).
# On Railway you can override the start command per service, e.g.:
#   - "npm run worker:discover"  (one-shot discover)
#   - "npm run worker:process"   (one-shot process batch)
CMD ["npm", "run", "worker:start"]
