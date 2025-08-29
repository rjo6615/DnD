import { useState, useEffect } from 'react';
import apiFetch from '../utils/apiFetch';

export default function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    apiFetch('/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (isMounted) {
          setUser(data ? { username: data.username, isDM: data.isDM } : null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return user;
}
