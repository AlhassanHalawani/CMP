import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsApi } from '@/api/analytics';

function getOrCreateSessionId(): string {
  const key = 'cmp-session-id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function PageViewTracker() {
  const location = useLocation();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (lastTracked.current === path) return;
    lastTracked.current = path;

    const session_id = getOrCreateSessionId();
    analyticsApi.recordPageView({
      session_id,
      path,
      referrer: document.referrer || undefined,
    });
  }, [location.pathname]);

  return null;
}
