import type { PersonSearchResult, CompanySearchResult } from '../../types/types.ts';

const BASE_URL = 'https://partner.192.com';

function getApiKey(): string | undefined {
  return process.env.API_192_KEY;
}

function buildHeaders(): Record<string, string> {
  return {
    'X-API-Key': getApiKey() ?? '',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

/**
 * Search for a person using the 192.com partner API
 */
export async function personSearch(
  firstName: string,
  lastName: string,
  location?: string
): Promise<PersonSearchResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_192_KEY environment variable is not set');
  }

  try {
    const url = new URL(`${BASE_URL}/v1/people/search`);
    url.searchParams.append('first_name', firstName);
    url.searchParams.append('last_name', lastName);
    if (location) {
      url.searchParams.append('location', location);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`192.com API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as {
      results?: Array<{
        first_name?: string;
        last_name?: string;
        address?: string;
        phone?: string;
        date_of_birth?: string;
      }>;
    };

    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((item) => ({
      firstName: item.first_name ?? '',
      lastName: item.last_name ?? '',
      address: item.address ?? '',
      phone: item.phone ?? '',
      dateOfBirth: item.date_of_birth ?? '',
    }));
  } catch (error) {
    throw new Error(`Person search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for a company using the 192.com partner API
 */
export async function companySearch(
  companyName: string,
  registrationNumber?: string
): Promise<CompanySearchResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_192_KEY environment variable is not set');
  }

  try {
    const url = new URL(`${BASE_URL}/v1/companies/search`);
    url.searchParams.append('company_name', companyName);
    if (registrationNumber) {
      url.searchParams.append('registration_number', registrationNumber);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`192.com API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as {
      results?: Array<{
        company_name?: string;
        registration_number?: string;
        address?: string;
        status?: string;
        incorporation_date?: string;
      }>;
    };

    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((item) => ({
      companyName: item.company_name ?? '',
      registrationNumber: item.registration_number ?? '',
      address: item.address ?? '',
      status: item.status ?? '',
      incorporationDate: item.incorporation_date ?? '',
    }));
  } catch (error) {
    throw new Error(`Company search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
