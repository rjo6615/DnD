import { useState, useEffect } from 'react';

export default function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (isMounted) {
          setUser(data);
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
