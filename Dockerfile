# ── Shared base ───────────────────────────────────────────────────────
FROM node:24.21-bookworm-slim AS base
# COREPACK_HOME outside /root so the non-root tools user can run the cached pnpm offline.
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_HOME=/corepack NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ── Dependencies (cached until the lockfile changes) ──────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
# Placeholder URL: `prisma generate` (postinstall) reads the config but never connects.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm install --frozen-lockfile

# ── Build. No secrets exist at this stage; the app validates them at start-up instead. ──
FROM deps AS build
COPY . .
# public/ may be empty, and git does not track empty folders; make sure it exists for the runtime COPY.
RUN mkdir -p public && pnpm build

# ── Tools: migrations and the staff CLI, run as one-off containers ────
FROM build AS tools
# Source files keep the build host's modes; make them readable for the non-root user.
RUN chmod -R a+rX package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts prisma scripts src
# Binaries are called directly: `pnpm run` would try to re-verify node_modules as a non-root user.
ENV PATH=/app/node_modules/.bin:$PATH
USER node
CMD ["prisma", "migrate", "deploy"]

# ── Runtime: only the standalone server, as a non-root user ───────────
FROM node:24.21-bookworm-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
