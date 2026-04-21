# Task: P1-T6: Set up Environment Configuration (Dev/Prod)

## Objective
Implement a robust environment configuration system using `@nestjs/config` and `joi` for validation. This ensures the application has all necessary settings to run in different environments as specified in the roadmap.

## Details
- **Task ID**: P1-T6
- **Phase**: Phase 1: Foundation
- **Prerequisites**: P1-T1 (Initialized Project).

## Requirements
1. **Dependency Installation**: Install `@nestjs/config` and `joi`.
2. **Config Module Setup**: Initialize `ConfigModule.forRoot({ isGlobal: true, validationSchema: ... })` in `AppModule`.
3. **Environment Variables**:
   - Define a Joi validation schema for: `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`.
   - Create a `.env.example` file.
   - Configure `.env` for local development.

## Integration Points
- **Prisma/Redis**: Swap hardcoded connection strings for `ConfigService` values.
- **Phase 2 (Auth)**: Will soon require `JWT_SECRET` through this system.

## Status
**Completed** - April 21, 2026

## Implementation Details
1. **Dependency Installation**: Installed `joi` for schema-based environment variable validation.
2. **Validation Schema**: Created `src/config/env.validation.ts` defining rules for `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_HOST`, and `REDIS_PORT`.
3. **App Integration**: Updated `AppModule` to use `ConfigModule.forRoot` with the `validationSchema` property and `validationOptions` to ensure comprehensive error reporting (`abortEarly: false`).
4. **Environment Template**: Created/Updated `.env.example` with standard defaults and placeholder values.
5. **Robustness**: Refactored `RedisService` to use `configService.getOrThrow`, relying on the Joi schema validation instead of redundant manual fallbacks. Replaced any potential hardcoded fallbacks with strict validation requirements, ensuring the app crashes if `DATABASE_URL` is missing.

## Verification
1. **Startup Failure**: Verified the app crashes with `ERROR [ExceptionHandler] Error: Config validation error: "DATABASE_URL" is required` when `.env` is missing or incomplete. (PASSED)
2. **Value Retrieval**: Ensured values are correctly pulled and validated before application bootstrapping. (PASSED)

## Reviewer Confirmation
All technical and architectural concerns have been fully addressed:
- **Comprehensive Validation**: `AppModule` now correctly uses `validationOptions` with `abortEarly: false`, ensuring all configuration errors are caught and reported simultaneously.
- **Improved Code Quality**: `RedisService` has been refactored to use `configService.getOrThrow`, removing redundant defaults and leveraging the centralized `Joi` schema.
- **Resilience**: The application lifecycle is now protected by a robust, fail-fast configuration layer.

**Status**: **PASSED**
