FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Artifacts are produced by `npm run build` on the host; the image only copies them
COPY .next/standalone ./
COPY .next/static ./.next/static

# Read from disk at runtime via process.cwd(), so the standalone trace does not reliably include them
COPY reports ./reports
COPY docs ./docs

# Run as the unprivileged user shipped with the node image
USER node

EXPOSE 3000

CMD ["node", "server.js"]
