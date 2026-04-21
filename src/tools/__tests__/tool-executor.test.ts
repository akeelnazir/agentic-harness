import { executeTool } from '../tool-executor.ts';
import { readFromFile } from '../read-file.ts';
import { runShell } from '../run-shell.ts';
import { writeToFile } from '../write-file.ts';

jest.mock('../read-file.ts');
jest.mock('../run-shell.ts');
jest.mock('../write-file.ts');

const mockedReadFromFile = jest.mocked(readFromFile);
const mockedRunShell = jest.mocked(runShell);
const mockedWriteToFile = jest.mocked(writeToFile);

describe('executeTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute read_file tool successfully', async () => {
    mockedReadFromFile.mockResolvedValueOnce({
      success: true,
      content: 'File content',
      filepath: 'test.txt',
      message: 'Successfully read test.txt',
    });
    
    const result = await executeTool('read_file', '{"filename": "test.txt"}');
    
    expect(result).toBe('File content');
  });

  it('should handle read_file tool failure', async () => {
    mockedReadFromFile.mockResolvedValueOnce({
      success: false,
      content: null,
      filepath: 'test.txt',
      message: 'File not found',
    });
    
    const result = await executeTool('read_file', '{"filename": "test.txt"}');
    
    expect(result).toContain('Failed to read file');
  });

  it('should execute run_shell tool successfully', async () => {
    mockedRunShell.mockResolvedValueOnce({
      success: true,
      message: 'Command executed successfully',
      stdout: 'Output',
      stderr: '',
      exitCode: 0,
      command: 'echo test',
    });
    
    const result = await executeTool('run_shell', '{"command": "echo test", "timeout": 30000}');
    
    expect(result).toContain('Command executed successfully');
  });

  it('should handle run_shell tool failure', async () => {
    mockedRunShell.mockResolvedValueOnce({
      success: false,
      message: 'Command failed',
      stdout: '',
      stderr: 'Error',
      exitCode: 1,
      command: 'echo test',
    });
    
    const result = await executeTool('run_shell', '{"command": "echo test", "timeout": 30000}');
    
    expect(result).toContain('Failed to execute command');
  });

  it('should execute write_file tool successfully', async () => {
    mockedWriteToFile.mockResolvedValueOnce({
      success: true,
      message: 'Created new file test.txt',
      filename: 'test.txt',
      mode: 'created',
    });
    
    const result = await executeTool('write_file', '{"filename": "test.txt", "content": "Hello"}');
    
    expect(result).toContain('File written successfully');
  });

  it('should handle write_file tool failure', async () => {
    mockedWriteToFile.mockResolvedValueOnce({
      success: false,
      message: 'Failed to write file: Permission denied',
      filename: 'test.txt',
      mode: 'created',
    });
    
    const result = await executeTool('write_file', '{"filename": "test.txt", "content": "Hello"}');
    
    expect(result).toContain('Failed to write file');
  });

  it('should handle unknown tool', async () => {
    const result = await executeTool('unknown_tool', '{"filename": "test.txt", "content": "Hello"}');
    
    expect(result).toBe('Unknown tool: unknown_tool');
  });
});