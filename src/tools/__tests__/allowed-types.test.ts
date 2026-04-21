import { allowedTypes, isAllowedType } from '../allowed-types.ts';

describe('allowedTypes', () => {
  it('should contain a comprehensive list of allowed types/files', () => {
    expect(Array.isArray(allowedTypes)).toBe(true);
    expect(allowedTypes).toHaveLength(42);
  });
});

describe('isAllowedType', () => {
  // --- Test Case 1: Allowed Extensions (Case Insensitive) ---
  test('should return true for various allowed file extensions', () => {
    expect(isAllowedType('file.txt')).toBe(true);
    expect(isAllowedType('script.js')).toBe(true);
    expect(isAllowedType('data.json')).toBe(true);
    expect(isAllowedType('README.md')).toBe(true);
    expect(isAllowedType('config.yaml')).toBe(true);
  });

  test('should handle case insensitivity for extensions', () => {
    // Test uppercase extension
    expect(isAllowedType('file.TXT')).toBe(true);
    // Test mixed case extension
    expect(isAllowedType('script.Js')).toBe(true);
  });

  // --- Test Case 2: Allowed Filenames (Exact Match) ---
  test('should return true for various allowed filenames', () => {
    // Exact file names
    expect(isAllowedType('Makefile')).toBe(true);
    expect(isAllowedType('package.json')).toBe(true);
    expect(isAllowedType('.gitignore')).toBe(true);
    expect(isAllowedType('docker-compose.yml')).toBe(true);
  });

  test('should handle case insensitivity for filenames', () => {
    // Note: The implementation uses lowerCase() comparison, so this should pass.
    expect(isAllowedType('PACKAGE.JSON')).toBe(true);
    expect(isAllowedType('MAKEFILE')).toBe(true);
  });

  // --- Test Case 3: Negative Cases (Not Allowed) ---
  test('should return false for disallowed file extensions', () => {
    expect(isAllowedType('file.exe')).toBe(false);
    expect(isAllowedType('image.png')).toBe(false);
  });

  test('should return false for unknown filenames without allowed extensions', () => {
    expect(isAllowedType('unknown-config')).toBe(false);
    expect(isAllowedType('random_file.exe')).toBe(false);
  });

  // --- Test Case 4: Edge Cases and Invalid Input ---
  test('should return false for null, undefined, or non-string inputs', () => {
    // @ts-ignore Testing invalid types
    expect(isAllowedType(null)).toBe(false);
    // @ts-ignore
    expect(isAllowedType(undefined)).toBe(false);
    // @ts-ignore
    expect(isAllowedType(12345)).toBe(false);
  });

  test('should return false for empty string input', () => {
    expect(isAllowedType('')).toBe(false);
  });
});