import { writeToFile } from '../write-file.ts';
import { mkdir, writeFile, access } from 'fs/promises';

jest.mock('fs/promises');

const mockedAccess = jest.mocked(access);
const mockedMkdir = jest.mocked(mkdir);
const mockedWriteFile = jest.mocked(writeFile);

describe('writeToFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new file with content when file does not exist', async () => {
    mockedAccess.mockRejectedValueOnce(new Error('Not found'));
    mockedAccess.mockRejectedValueOnce(new Error('Not found'));
    mockedWriteFile.mockResolvedValueOnce(undefined);
    
    const result = await writeToFile('test.txt', 'Hello');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Created new file');
    expect(result.mode).toBe('created');
  });

  it('should overwrite existing file when file exists', async () => {
    mockedAccess.mockResolvedValueOnce(undefined);
    mockedAccess.mockResolvedValueOnce(undefined);
    mockedWriteFile.mockResolvedValueOnce(undefined);
    
    const result = await writeToFile('test.txt', 'Hello');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Wrote content to existing file');
    expect(result.mode).toBe('overwrite');
  });

  it('should create folder if it does not exist', async () => {
    mockedAccess.mockRejectedValueOnce(new Error('Not found'));
    mockedMkdir.mockResolvedValueOnce(undefined);
    mockedAccess.mockRejectedValueOnce(new Error('Not found'));
    mockedWriteFile.mockResolvedValueOnce(undefined);
    
    const result = await writeToFile('subfolder/test.txt', 'Hello');
    
    expect(result.success).toBe(true);
    expect(result.mode).toBe('created');
  });

  it('should handle errors when writing fails', async () => {
    mockedAccess.mockResolvedValueOnce(undefined);
    mockedAccess.mockResolvedValueOnce(undefined);
    mockedWriteFile.mockRejectedValueOnce(new Error('Permission denied'));
    
    const result = await writeToFile('test.txt', 'Hello');
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to write file');
  });
});