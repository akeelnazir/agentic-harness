export interface Prompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ReadResult {
  success: boolean;
  message: string;
  content: string | null;
  filepath: string;
}

export interface ToolRequest {
  type: 'read';
  value: string;
  secondaryValue?: string;
}