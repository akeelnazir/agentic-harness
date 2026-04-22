import type { SearchResult } from '../../types/types.ts';

/**
 * Search the web for information
 * Uses SerpAPI if available, otherwise falls back to mock results
 */
export async function webSearch(query: string): Promise<SearchResult[]> {
  return await duckDuckGoSearch(query);
}

/**
 * Free web search using SerpAPI free tier
 */
export async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  try {
    const serpApiKey = process.env.SERPAPI_KEY;
    
    if (serpApiKey) {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('q', query);
      url.searchParams.append('api_key', serpApiKey);
      url.searchParams.append('num', '5');
      
      const response = await fetch(url.toString());
      
      if (response.ok) {
        const data = await response.json() as { organic_results?: Array<{ title: string; link: string; snippet: string }> };
        const results: SearchResult[] = [];
        
        if (data.organic_results) {
          for (const item of data.organic_results.slice(0, 5)) {
            results.push({
              title: item.title,
              url: item.link,
              description: item.snippet
            });
          }
        }
        
        if (results.length > 0) {
          console.log(`[WEB SEARCH] SerpAPI returned ${results.length} results`);
          return results;
        }
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error during SerpAPI search:', error);
    return [];
  }
}
