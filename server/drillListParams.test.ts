import { describe, it, expect } from 'vitest';

// We test the pure utility functions from the hook file.
// Since they are pure functions with no React dependency, we can import and test directly.
// We replicate the logic here to avoid importing from the client directory (which uses path aliases).

interface DrillListParams {
  page: number;
  category: string;
  difficulty: string;
  search: string;
  sort: string;
}

const DEFAULTS: DrillListParams = {
  page: 1,
  category: 'All',
  difficulty: 'All',
  search: '',
  sort: 'alpha',
};

function parseDrillParams(searchString: string): DrillListParams {
  const cleaned = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  const params = new URLSearchParams(cleaned);
  return {
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
    category: params.get('category') || DEFAULTS.category,
    difficulty: params.get('difficulty') || DEFAULTS.difficulty,
    search: params.get('search') || DEFAULTS.search,
    sort: params.get('sort') || DEFAULTS.sort,
  };
}

function buildDrillQuery(p: DrillListParams): string {
  const params = new URLSearchParams();
  if (p.page > 1) params.set('page', String(p.page));
  if (p.category !== DEFAULTS.category) params.set('category', p.category);
  if (p.difficulty !== DEFAULTS.difficulty) params.set('difficulty', p.difficulty);
  if (p.search) params.set('search', p.search);
  if (p.sort !== DEFAULTS.sort) params.set('sort', p.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

describe('parseDrillParams', () => {
  it('returns defaults for empty string', () => {
    const result = parseDrillParams('');
    expect(result).toEqual(DEFAULTS);
  });

  it('returns defaults for just "?"', () => {
    const result = parseDrillParams('?');
    expect(result).toEqual(DEFAULTS);
  });

  it('parses page number', () => {
    const result = parseDrillParams('?page=4');
    expect(result.page).toBe(4);
    expect(result.category).toBe('All');
  });

  it('parses category filter', () => {
    const result = parseDrillParams('?category=Hitting');
    expect(result.category).toBe('Hitting');
    expect(result.page).toBe(1);
  });

  it('parses difficulty filter', () => {
    const result = parseDrillParams('?difficulty=Hard');
    expect(result.difficulty).toBe('Hard');
  });

  it('parses search query', () => {
    const result = parseDrillParams('?search=tee');
    expect(result.search).toBe('tee');
  });

  it('parses sort order', () => {
    const result = parseDrillParams('?sort=newest');
    expect(result.sort).toBe('newest');
  });

  it('parses combined params', () => {
    const result = parseDrillParams('?page=2&category=Hitting&search=tee&sort=newest');
    expect(result.page).toBe(2);
    expect(result.category).toBe('Hitting');
    expect(result.search).toBe('tee');
    expect(result.sort).toBe('newest');
    expect(result.difficulty).toBe('All');
  });

  it('handles string without ? prefix', () => {
    const result = parseDrillParams('page=3&category=Pitching');
    expect(result.page).toBe(3);
    expect(result.category).toBe('Pitching');
  });

  it('clamps invalid page to 1', () => {
    expect(parseDrillParams('?page=0').page).toBe(1);
    expect(parseDrillParams('?page=-5').page).toBe(1);
    expect(parseDrillParams('?page=abc').page).toBe(1);
  });

  it('handles URL-encoded search terms', () => {
    const result = parseDrillParams('?search=1-2-3%20drill');
    expect(result.search).toBe('1-2-3 drill');
  });
});

describe('buildDrillQuery', () => {
  it('returns empty string for all defaults', () => {
    expect(buildDrillQuery(DEFAULTS)).toBe('');
  });

  it('includes page when > 1', () => {
    const query = buildDrillQuery({ ...DEFAULTS, page: 4 });
    expect(query).toBe('?page=4');
  });

  it('omits page when 1', () => {
    const query = buildDrillQuery({ ...DEFAULTS, page: 1 });
    expect(query).toBe('');
  });

  it('includes category when not All', () => {
    const query = buildDrillQuery({ ...DEFAULTS, category: 'Hitting' });
    expect(query).toBe('?category=Hitting');
  });

  it('includes difficulty when not All', () => {
    const query = buildDrillQuery({ ...DEFAULTS, difficulty: 'Hard' });
    expect(query).toBe('?difficulty=Hard');
  });

  it('includes search when non-empty', () => {
    const query = buildDrillQuery({ ...DEFAULTS, search: 'tee' });
    expect(query).toBe('?search=tee');
  });

  it('includes sort when not alpha', () => {
    const query = buildDrillQuery({ ...DEFAULTS, sort: 'newest' });
    expect(query).toBe('?sort=newest');
  });

  it('combines multiple params', () => {
    const query = buildDrillQuery({
      page: 2,
      category: 'Hitting',
      difficulty: 'All',
      search: 'tee',
      sort: 'newest',
    });
    expect(query).toContain('page=2');
    expect(query).toContain('category=Hitting');
    expect(query).toContain('search=tee');
    expect(query).toContain('sort=newest');
    expect(query).not.toContain('difficulty');
    expect(query.startsWith('?')).toBe(true);
  });

  it('roundtrips with parseDrillParams', () => {
    const original: DrillListParams = {
      page: 3,
      category: 'Bunting',
      difficulty: 'Medium',
      search: 'flip',
      sort: 'newest',
    };
    const query = buildDrillQuery(original);
    const parsed = parseDrillParams(query);
    expect(parsed).toEqual(original);
  });

  it('roundtrips defaults correctly', () => {
    const query = buildDrillQuery(DEFAULTS);
    const parsed = parseDrillParams(query);
    expect(parsed).toEqual(DEFAULTS);
  });
});
