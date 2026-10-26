import { useEffect, useState } from 'react';

export type Page = 'home' | 'about' | 'contact';

/** Hash URLs work when the site is served from a GitHub Pages project path. */
export function usePageRoute() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const updateRoute = () => setHash(window.location.hash);
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  const page: Page = hash.replace(/\/$/, '') === '#/about'
    ? 'about'
    : hash.replace(/\/$/, '') === '#/contact'
      ? 'contact'
      : 'home';

  return { page, hash };
}
