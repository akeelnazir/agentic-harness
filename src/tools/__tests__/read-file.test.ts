import { readFromFile } from '../file-reader/read-file.ts';
import type { ReadResult } from '../../types/types.ts';

describe('readFromFile', () => {
  it('should return success with content for valid file', async () => {
    // Mock the readFile function to simulate successful reading
    const mockContent = 'Hello, World!';
    jest.spyOn(require('fs/promises'), 'readFile').mockResolvedValueOnce(mockContent);
    
    const result: ReadResult = await readFromFile('test.txt');
    
    expect(result.success).toBe(true);
    expect(result.content).toBe(mockContent);
    expect(result.message).toContain('Successfully read test.txt');
  });

  it('should return error when file extension is not allowed', async () => {
    const result: ReadResult = await readFromFile('test.exe');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toContain('Cannot read file');
  });

  it('should return error when filepath contains ..', async () => {
    const result: ReadResult = await readFromFile('test..txt');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toContain('only files in the current folder can be read for security reasons');
  });

  it('should return error when filepath is absolute', async () => {
    const result: ReadResult = await readFromFile('/absolute/path.txt');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toContain('Cannot read file');
  });

  it('should return error when file does not exist', async () => {
    const result: ReadResult = await readFromFile('nonexistent.txt');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toContain('Failed to read file');
  });

  it('should return error when fs/promises.readFile throws', async () => {
    jest.spyOn(require('fs/promises'), 'readFile').mockRejectedValue(new Error('Permission denied'));
    
    const result: ReadResult = await readFromFile('test.txt');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toContain('Failed to read file');
  });
});