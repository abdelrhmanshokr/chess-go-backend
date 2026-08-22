🤖 AI Agent‑Driven Development Workflow

This project uses a team of AI agents to implement, test, and document features in a structured, step‑by‑step manner. Each agent has a specific role, and you (the developer) act as the coordinator, triggering them in sequence.
NestJS (Node.js with TypeScript). Project initialized on April 1, 2026.
- **Strict Mode**: Fully enabled in `tsconfig.json`.
- **Database ORM**: Prisma ORM configured with PostgreSQL.
- **Caching/Pub-Sub**: Redis (ioredis) integrated for high-frequency data and real-time sync.
- **Real-time Engine**: Socket.io with Redis Adapter for horizontal scaling.
- **Chess Engine**: `chess.js` for move validation and game state management (FEN/PGN).
- **Environment Config**: `@nestjs/config` with `Joi` schema-based validation.
- **Database Schema**: Version-controlled Prisma migrations for PostgreSQL.
- **Architecture**: Standard NestJS structure with `src/`, `test/`, `prisma/` (Schema/Migrations), `redis/`, `game/` (Gateway), and `config/` (Validation) folders.
- **Build Status**: Verified with `npm run build` and `npm run start`.

## 🛠️ Technology Stack
### Backend
- **Framework**: NestJS (Node.js with TypeScript)
- **Database**: PostgreSQL (Structured via Prisma)
- **ORM**: Prisma (Service & Module globally configured)
- **Caching/Pub-Sub**: Redis (Service & Module globally configured via `ioredis`)
- **WebSockets**: Socket.io (with Redis IoAdapter for scalability)
- **Chess Engine**: `chess.js` (move validation)
- **Configuration**: `@nestjs/config` with `Joi` validation
- **Authentication**: JWT with Passport.js
- **Password Hashing**: bcrypt

## 🚀 Getting Started
### Prerequisites
- Node.js (v18+)
- npm
- PostgreSQL (v14+ recommended)
- Redis (v6+ for caching and pub/sub)

### Installation
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure Environment: Copy `.env.example` to `.env` and provide your specific credentials including `JWT_SECRET`.
4. Database Setup:
   ```bash
   npx prisma migrate dev  # Runs migrations
   npx prisma generate     # Updates Prisma Client
   npx prisma db seed      # Populates test users
   ```
5. Run the development server: `npm run start:dev`

## 🔐 Authentication
The project uses JSON Web Tokens (JWT) for secure state management and endpoint protection.
- **Registration**: Secure `POST /auth/register` endpoint with bcrypt hashing (10 salt rounds) and duplicate checks.
- **Login**: `POST /auth/login` endpoint accepting email or username as an `identifier`. Returns a signed JWT upon successful credential verification.
- **Refresh Token**: `POST /auth/refresh` endpoint supporting token rotation. Issues a new access/refresh token pair and updates the stored hash in the database for security.
- **Logout**: `POST /auth/logout` endpoint to invalidate the user's refresh token by clearing the stored hash from the database.
- **Profile Management**:
  - `GET /users/me`: Returns the authenticated user's private profile.
  - `GET /users/:id`: Returns public profile information for any user.
  - `PATCH /users/me`: Allows users to update their profile (e.g., username) with validation.
  - `GET /users/:id/stats`: Retrieves a player's Elo rating and win/loss/draw statistics.
- **Leaderboard**:
  - `GET /leaderboard`: Returns a paginated list of top players ranked by Elo rating.
- **Profile**: Protected `GET /auth/profile` endpoint using `JwtAuthGuard` and `@CurrentUser()` decorator to retrieve the authenticated user's information.
- **WebSocket Protection**: `WsJwtGuard` secures the `GameGateway`, extracting and validating tokens from the handshake or headers, attaching the identity to `client.data.user`.
- **Strategy**: `JwtStrategy` extracts and validates Bearer tokens from the `Authorization` header.
- **Configuration**: `JWT_SECRET` and `JWT_EXPIRATION` are strictly validated via the `ConfigModule`.
- **Identity**: Consistent payload structure `{ sub: userId, email }` used across signing and validation.

## ⚙️ Configuration
The application uses strict environment variable validation.
- **Tools**: `@nestjs/config` + `Joi`.
- **Validation**: Fails fast if required variables (`DATABASE_URL`, `REDIS_HOST`, etc.) are missing or malformed.
- **Secrets**: Handled via `.env` (excluded from Git).

## 🗄️ Database Schema
The project uses Prisma to manage its PostgreSQL schema.
- **User**: Authentication, Elo ratings, and game statistics.
- **Game**: 2v2 match state, FEN strings, and status tracking.
- **Move**: Full move history with composite indexing for performance.
- **GameTimer**: Persistence for individual and team time controls.
- **DrawOffer**: Unanimous voting logic for shared game results.

## 📡 WebSockets
The project uses Socket.io for real-time communication.
- **Gateway**: `GameGateway` (handles connections and game events)
- **Adapter**: `RedisIoAdapter` (syncs events across server instances)
- **Default Port**: 3000 (standard NestJS port)
- **Ping/Pong**: Send a `ping` event to receive a `pong` response from the server.

## ♟️ Chess Engine
The backend integration includes `chess.js` to enforce rules and manage game state.
- **Move Validation**: Validates moves against FEN states.
- **State Management**: Handles standard chess notation (FEN/PGN).
- **Core Engine**: Powers `GameService`.

## 🎮 Game Core (`GameService`)
Server-side authority for game state, backed by Prisma and `chess.js`. No REST/WS surface yet — this is the internal service Phase 5's `GameGateway` will call directly.
- **`createGame(dto)`**: Persists a new 2v2 `Game` from 4 named seats (`whitePlayer1Id`/`whitePlayer2Id`/`blackPlayer1Id`/`blackPlayer2Id`), rejecting duplicate or non-existent player IDs.
- **`makeMove(gameId, playerId, move)`**: Validates the move server-side via `chess.js`, then atomically updates `Game.fen` and logs a `Move` row.
- **`validateMove(fen, move)`**: Pure legality check against a given FEN — used internally by `makeMove`, reusable by the future gateway.
- **`forfeit(gameId, playerId)`**: Stub — validates inputs but doesn't yet end the game (full resignation flow lands with win/loss detection).
- **Not yet enforced**: 2v2 turn rotation across teammates and win/loss/stalemate detection — both deferred to sibling Phase 3 tasks.

## 🧠 The Agents
Agent	File	Responsibility
Planner	ai_agents_docs/PLANNER.md	Maintains the big picture – knows the project logic, task breakdown, and progress. Answers questions about architecture and suggests the next task.
Coder	ai_agents_docs/CODER.md	Implements one task at a time. Writes clean, maintainable code following project patterns.
Tester	ai_agents_docs/TESTER.md	Writes unit tests for the code produced by the coder. Ensures coverage of normal cases, edge cases, and errors.
Reviewer	ai_agents_docs/REVIEWER.md	Reviews the code for security, performance, style, and adherence to the design. Provides structured feedback.
Documenter	ai_agents_docs/DOCUMENTER.md	Documents the completed task and updates the main project documentation. Only this agent updates progress.md.