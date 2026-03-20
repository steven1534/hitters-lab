import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';

export interface DrillListParams {
  page: number;
  category: string;
  difficulty: string;
  search: string;
  sort: string;
}

const DEFAULTS: DrillListParams = {
  page: 1,
  category: 'Hitting',
  difficulty: 'All',
  search: '',
  sort: 'alpha',
};

/**
 * Parse URL search string into DrillListParams.
 * `searchString` may or may not start with "?".
 */
export function parseDrillParams(searchString: string): DrillListParams {
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

/**
 * Build a query string from DrillListParams, omitting defaults
 */
export function buildDrillQuery(p: DrillListParams): string {
  const params = new URLSearchParams();
  if (p.page > 1) params.set('page', String(p.page));
  if (p.category !== DEFAULTS.category) params.set('category', p.category);
  if (p.difficulty !== DEFAULTS.difficulty) params.set('difficulty', p.difficulty);
  if (p.search) params.set('search', p.search);
  if (p.sort !== DEFAULTS.sort) params.set('sort', p.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Hook that syncs drill list filter state with URL query parameters.
 * Reads initial state from URL on mount, and pushes URL updates when state changes.
 */
export function useDrillListParams() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const isInitialized = useRef(false);

  // Parse initial state from URL
  const initial = parseDrillParams(searchString);

  const [page, setPageRaw] = useState(initial.page);
  const [category, setCategoryRaw] = useState(initial.category);
  const [difficulty, setDifficultyRaw] = useState(initial.difficulty);
  const [search, setSearchRaw] = useState(initial.search);
  const [sort, setSortRaw] = useState(initial.sort);

  // Sync URL whenever state changes (after initialization)
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }
    const query = buildDrillQuery({ page, category, difficulty, search, sort });
    const newUrl = `/${query}`;
    // Use navigate with replace:false to push history entries
    navigate(newUrl, { replace: false });
  }, [page, category, difficulty, search, sort]);

  // When user navigates back/forward, re-read URL params
  useEffect(() => {
    if (!isInitialized.current) return;
    const parsed = parseDrillParams(searchString);
    // Only update if values actually differ to avoid loops
    if (parsed.page !== page) setPageRaw(parsed.page);
    if (parsed.category !== category) setCategoryRaw(parsed.category);
    if (parsed.difficulty !== difficulty) setDifficultyRaw(parsed.difficulty);
    if (parsed.search !== search) setSearchRaw(parsed.search);
    if (parsed.sort !== sort) setSortRaw(parsed.sort);
  }, [searchString]);

  // Wrapped setters that reset page to 1 when filters change
  const setCategory = useCallback((val: string) => {
    setCategoryRaw(val);
    setPageRaw(1);
  }, []);

  const setDifficulty = useCallback((val: string) => {
    setDifficultyRaw(val);
    setPageRaw(1);
  }, []);

  const setSearch = useCallback((val: string) => {
    setSearchRaw(val);
    setPageRaw(1);
  }, []);

  const setSort = useCallback((val: string) => {
    setSortRaw(val);
    setPageRaw(1);
  }, []);

  const setPage = useCallback((val: number) => {
    setPageRaw(val);
  }, []);

  const resetAll = useCallback(() => {
    setPageRaw(DEFAULTS.page);
    setCategoryRaw(DEFAULTS.category);
    setDifficultyRaw(DEFAULTS.difficulty);
    setSearchRaw(DEFAULTS.search);
    setSortRaw(DEFAULTS.sort);
  }, []);

  // Build current query string for use in drill card links
  const currentQuery = buildDrillQuery({ page, category, difficulty, search, sort });

  return {
    page,
    category,
    difficulty,
    search,
    sort,
    setPage,
    setCategory,
    setDifficulty,
    setSearch,
    setSort,
    resetAll,
    currentQuery,
  };
}
