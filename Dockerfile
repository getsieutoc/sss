# syntax=docker/dockerfile:1

FROM node:20-alpine AS alpine

RUN apk update
RUN apk add --no-cache libc6-compat

FROM alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@9.12.0 --activate

# Create app directory
WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

# Install app dependencies
RUN pnpm install --frozen-lockfile

# Bundle app source
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Creates a "dist" folder with the production build
RUN pnpm run build

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
