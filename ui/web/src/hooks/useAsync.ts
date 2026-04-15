import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs `fn` on mount (and whenever `deps` change), tracks loading/error state,
 * and exposes a `reload` callback to re-run manually.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const mounted = useRef(true);

  const run = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }));
    fn()
      .then(data => { if (mounted.current) setState({ data, loading: false, error: null }); })
      .catch((e: Error) => { if (mounted.current) setState({ data: null, loading: false, error: e.message }); });
  // deps are forwarded intentionally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => { mounted.current = false; };
  }, [run]);

  return { ...state, reload: run };
}
