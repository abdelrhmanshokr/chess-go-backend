import * as Joi from 'joi';
import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('should validate valid configuration', () => {
    const validConfig = {
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
    };
    const { error, value } = envValidationSchema.validate(validConfig);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
  });

  it('should apply default values', () => {
    const minimalConfig = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    };
    const { error, value } = envValidationSchema.validate(minimalConfig);
    expect(error).toBeUndefined();
    expect(value.NODE_ENV).toBe('development');
    expect(value.PORT).toBe(3000);
    expect(value.REDIS_HOST).toBe('localhost');
  });

  it('should error if DATABASE_URL is missing', () => {
    const invalidConfig = {
      NODE_ENV: 'development',
    };
    const { error } = envValidationSchema.validate(invalidConfig);
    expect(error).toBeDefined();
    expect(error.message).toContain('"DATABASE_URL" is required');
  });

  it('should error if NODE_ENV is invalid', () => {
    const invalidConfig = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NODE_ENV: 'invalid_env',
    };
    const { error } = envValidationSchema.validate(invalidConfig);
    expect(error).toBeDefined();
    expect(error.message).toContain('"NODE_ENV" must be one of [development, production, test]');
  });
});
