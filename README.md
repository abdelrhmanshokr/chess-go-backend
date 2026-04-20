🤖 AI Agent‑Driven Development Workflow

This project uses a team of AI agents to implement, test, and document features in a structured, step‑by‑step manner. Each agent has a specific role, and you (the developer) act as the coordinator, triggering them in sequence.
NestJS (Node.js with TypeScript). Project initialized on April 1, 2026.
- **Strict Mode**: Fully enabled in `tsconfig.json`.
- **Database ORM**: Prisma ORM configured with PostgreSQL.
- **Caching/Pub-Sub**: Redis (ioredis) integrated for high-frequency data and real-time sync.
- **Architecture**: Standard NestJS structure with `src/`, `test/`, `prisma/`, and `redis/` folders.
- **Build Status**: Verified with `npm run build` and `npm run start`.

## 🛠️ Technology Stack
### Backend
- **Framework**: NestJS (Node.js with TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma (Service & Module globally configured)
- **Caching/Pub-Sub**: Redis (Service & Module globally configured via `ioredis`)
- **WebSockets**: Socket.io
- **Chess Engine**: chess.js (move validation)
- **Authentication**: JWT with Passport.js
- **Password Hashing**: bcrypt

## 🚀 Getting Started
### Prerequisites
- Node.js (v18+)
- npm
- PostgreSQL (for Prisma connection)
- Redis (v6+ for caching and pub/sub)

### Installation
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure Environment: Copy `.env.example` to `.env` and set `DATABASE_URL`, `REDIS_HOST`, and `REDIS_PORT`.
4. Initialize Prisma: `npx prisma generate`
5. Run the development server: `npm run start:dev`

## 🧠 The Agents
Agent	File	Responsibility
Planner	ai_agents_docs/PLANNER.md	Maintains the big picture – knows the project logic, task breakdown, and progress. Answers questions about architecture and suggests the next task.
Coder	ai_agents_docs/CODER.md	Implements one task at a time. Writes clean, maintainable code following project patterns.
Tester	ai_agents_docs/TESTER.md	Writes unit tests for the code produced by the coder. Ensures coverage of normal cases, edge cases, and errors.
Reviewer	ai_agents_docs/REVIEWER.md	Reviews the code for security, performance, style, and adherence to the design. Provides structured feedback.
Documenter	ai_agents_docs/DOCUMENTER.md	Documents the completed task and updates the main project documentation. Only this agent updates progress.md.