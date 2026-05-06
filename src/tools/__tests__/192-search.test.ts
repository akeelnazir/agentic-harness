import { personSearch, companySearch } from '../192-search/192-search.ts';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('personSearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw when API_192_KEY is not set', async () => {
    delete process.env.API_192_KEY;
    await expect(personSearch('John', 'Smith')).rejects.toThrow(
      'API_192_KEY environment variable is not set'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return empty array when API returns no results', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const results = await personSearch('John', 'Smith');
    expect(results).toEqual([]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/people/search'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'test-key' }),
      })
    );
  });

  it('should include first_name, last_name and location as query params', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await personSearch('Jane', 'Doe', 'London');
    const calledUrl: string = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('first_name=Jane');
    expect(calledUrl).toContain('last_name=Doe');
    expect(calledUrl).toContain('location=London');
  });

  it('should map API results to PersonSearchResult objects', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            first_name: 'John',
            last_name: 'Smith',
            address: '1 High Street, London, SW1A 1AA',
            phone: '02012345678',
            date_of_birth: '1980-01-01',
          },
        ],
      }),
    });

    const results = await personSearch('John', 'Smith');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      firstName: 'John',
      lastName: 'Smith',
      address: '1 High Street, London, SW1A 1AA',
      phone: '02012345678',
      dateOfBirth: '1980-01-01',
    });
  });

  it('should throw a descriptive error when the API returns a non-2xx status', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });

    await expect(personSearch('John', 'Smith')).rejects.toThrow('192.com API returned 401');
  });

  it('should throw a descriptive error when fetch throws', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(personSearch('John', 'Smith')).rejects.toThrow('Person search failed: Network failure');
  });
});

describe('companySearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw when API_192_KEY is not set', async () => {
    delete process.env.API_192_KEY;
    await expect(companySearch('Acme Ltd')).rejects.toThrow(
      'API_192_KEY environment variable is not set'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return empty array when API returns no results', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const results = await companySearch('Acme Ltd');
    expect(results).toEqual([]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/companies/search'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'test-key' }),
      })
    );
  });

  it('should include company_name and registration_number as query params', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await companySearch('Acme Ltd', '12345678');
    const calledUrl: string = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('company_name=Acme+Ltd');
    expect(calledUrl).toContain('registration_number=12345678');
  });

  it('should map API results to CompanySearchResult objects', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            company_name: 'Acme Ltd',
            registration_number: '12345678',
            address: '1 Business Park, London, EC1A 1BB',
            status: 'Active',
            incorporation_date: '2000-06-15',
          },
        ],
      }),
    });

    const results = await companySearch('Acme Ltd');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      companyName: 'Acme Ltd',
      registrationNumber: '12345678',
      address: '1 Business Park, London, EC1A 1BB',
      status: 'Active',
      incorporationDate: '2000-06-15',
    });
  });

  it('should throw a descriptive error when the API returns a non-2xx status', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });

    await expect(companySearch('Acme Ltd')).rejects.toThrow('192.com API returned 403');
  });

  it('should throw a descriptive error when fetch throws', async () => {
    process.env.API_192_KEY = 'test-key';
    mockFetch.mockRejectedValueOnce(new Error('Timeout'));

    await expect(companySearch('Acme Ltd')).rejects.toThrow('Company search failed: Timeout');
  });
});
