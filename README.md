# Super Simple Server

A lightweight NestJS server with built-in authentication, database integration, and Docker support.

## Features

- NestJS framework with TypeScript
- PostgreSQL database with Prisma ORM
- API key authentication
- Docker containerization
- API rate limiting
- Tests setup

## Prerequisites

- Node.js
- pnpm
- Docker

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Start development server:
   ```bash
   pnpm dev
   ```

The server will be available at `http://localhost:3001`

## Available Scripts

- `pnpm dev` - Start development server with Docker
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `pnpm lint` - Run linter
- `pnpm format` - Format code

## License

MIT License
