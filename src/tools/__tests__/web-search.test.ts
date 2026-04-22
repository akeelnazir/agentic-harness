import type { SearchResult } from '../../types/types.ts';
import { duckDuckGoSearch } from '../web-search/web-search.ts';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('webSearch', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should call duckDuckGoSearch and return its results', async () => {
    const mockResults: SearchResult[] = [
      { title: 'Test', url: 'http://test.com', description: 'Test description' }
    ];
    
    jest.doMock('../web-search/web-search.ts', () => ({
      duckDuckGoSearch: jest.fn(async () => mockResults)
    }));

    const { duckDuckGoSearch: mockedDuckDuckGoSearch } = await import('../web-search/web-search.ts');
    const results = await mockedDuckDuckGoSearch('test query');
    expect(results).toEqual(mockResults);
    
    jest.dontMock('../web-search/web-search.ts');
  });
});

describe('duckDuckGoSearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv }; // Reset env
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return empty array when SERPAPI_KEY is not set', async () => {
    delete process.env.SERPAPI_KEY;
    const results = await duckDuckGoSearch('test query');
    expect(results).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return empty array when SerpAPI returns no organic_results', async () => {
    process.env.SERPAPI_KEY = 'fake-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const results = await duckDuckGoSearch('test query');
    expect(results).toEqual([]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('serpapi.com/search'));
  });

  it('should return parsed results when SerpAPI returns organic_results', async () => {
    process.env.SERPAPI_KEY = 'fake-key';
    const mockData = {
      organic_results: [
        { title: 'Result 1', link: 'http://example1.com', snippet: 'Snippet 1' },
        { title: 'Result 2', link: 'http://example2.com', snippet: 'Snippet 2' }
      ]
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const results = await duckDuckGoSearch('test query');
    expect(results).toEqual([
      { title: 'Result 1', url: 'http://example1.com', description: 'Snippet 1' },
      { title: 'Result 2', url: 'http://example2.com', description: 'Snippet 2' }
    ]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('serpapi.com/search'));
  });

  it('should return empty array when SerpAPI response is not ok', async () => {
    process.env.SERPAPI_KEY = 'fake-key';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const results = await duckDuckGoSearch('test query');
    expect(results).toEqual([]);
    expect(fetch).toHaveBeenCalled();
  });

  it('should return empty array when fetch throws an error', async () => {
    process.env.SERPAPI_KEY = 'fake-key';
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const results = await duckDuckGoSearch('test query');
    expect(results).toEqual([]);
    expect(fetch).toHaveBeenCalled();
  });

  it('should limit results to 5 when more than 5 are returned', async () => {
    process.env.SERPAPI_KEY = 'fake-key';
    const mockData = {
      organic_results: Array.from({ length: 7 }, (_, i) => ({
        title: `Result ${i + 1}`,
        link: `http://example${i + 1}.com`,
        snippet: `Snippet ${i + 1}`
      }))
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const results = await duckDuckGoSearch('test query');
    expect(results).toHaveLength(5);
    expect(results[0]!.title).toBe('Result 1');
    expect(results[4]!.title).toBe('Result 5');
  });
});