# syntax=docker/dockerfile:1
# Multi-stage build for the ProSiddhi web app (Next.js 16, standalone output).
# Produces a small runtime image suitable for Cloud Run / GKE.

# ---- deps: install production + dev deps for the build ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: compile the Next.js app ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are inlined at build time — pass the API URL as a build arg.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
# Chat is hidden unless built with --build-arg NEXT_PUBLIC_CHAT_ENABLED=true.
ARG NEXT_PUBLIC_CHAT_ENABLED=false
ENV NEXT_PUBLIC_CHAT_ENABLED=$NEXT_PUBLIC_CHAT_ENABLED
# The Contact the Recruiter button is hidden unless built with
# --build-arg NEXT_PUBLIC_EMPLOYER_CONTACT_VISIBLE=true.
ARG NEXT_PUBLIC_EMPLOYER_CONTACT_VISIBLE=false
ENV NEXT_PUBLIC_EMPLOYER_CONTACT_VISIBLE=$NEXT_PUBLIC_EMPLOYER_CONTACT_VISIBLE
# Google Analytics: PRODUCTION ONLY, --build-arg NEXT_PUBLIC_GA_MEASUREMENT_ID=G-....
# Unset (staging, local) = no Google tag and nothing sent.
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
# Test-OTP pop-up: STAGING ONLY, --build-arg NEXT_PUBLIC_SHOW_TEST_OTP=true.
# Never set it for production. Needs the API's EXPOSE_OTP_IN_RESPONSE=true too.
ARG NEXT_PUBLIC_SHOW_TEST_OTP=false
ENV NEXT_PUBLIC_SHOW_TEST_OTP=$NEXT_PUBLIC_SHOW_TEST_OTP
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal image running the standalone server ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# .next/standalone contains a self-contained server + minimal node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
