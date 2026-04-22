import dotenv from 'dotenv';

dotenv.config();

export const LLMHOST_HOST =
  process.env.LLMHOST_HOST || 'http://127.0.0.1:1234/v1';
export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'nvidia/nemotron-3-nano-4b';
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export const MAX_ITERATIONS = process.env.MAX_ITERATIONS
  ? parseInt(process.env.MAX_ITERATIONS, 10)
  : 5;

export const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
export const LOG_FILE = process.env.LOG_FILE || 'agentic-harness.log';

export const SERPAPI_KEY = process.env.SERPAPI_KEY || '';

export const INPUT_TOKEN_PRICE_PER_MILLION = process.env.INPUT_TOKEN_PRICE_PER_MILLION
  ? parseFloat(process.env.INPUT_TOKEN_PRICE_PER_MILLION)
  : 1;

export const OUTPUT_TOKEN_PRICE_PER_MILLION = process.env.OUTPUT_TOKEN_PRICE_PER_MILLION
  ? parseFloat(process.env.OUTPUT_TOKEN_PRICE_PER_MILLION)
  : 5;

export const MAX_MESSAGES_TO_KEEP = process.env.MAX_MESSAGES_TO_KEEP
  ? parseInt(process.env.MAX_MESSAGES_TO_KEEP, 10)
  : 20;
