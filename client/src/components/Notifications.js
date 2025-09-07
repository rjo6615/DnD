import React, { useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { subscribe } from '../utils/notification';

export default function Notifications() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    let timer;
    const unsubscribe = subscribe((n) => {
      setNotification(n);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setNotification(null), 5000);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!notification) return null;

  return (
    <Alert
      variant={notification.variant}
      style={{ position: 'fixed', top: 20, right: 20, zIndex: 2000 }}
    >
      {notification.message}
    </Alert>
  );
}
