import dotenv from 'dotenv';

dotenv.config();

export const LLMHOST_HOST =
  process.env.LLMHOST_HOST || 'http://127.0.0.1:1234/v1';
export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'google/gemma-4-e4b';
export const MAX_ITERATIONS = process.env.MAX_ITERATIONS
  ? parseInt(process.env.MAX_ITERATIONS, 10)
  : 5;
