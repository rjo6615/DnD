import { useEffect, useState } from 'react';

const detectPointerEventsSupport = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  return 'PointerEvent' in window;
};

export default function usePointerEventsSupported() {
  const [isSupported, setIsSupported] = useState(detectPointerEventsSupport);

  useEffect(() => {
    setIsSupported(detectPointerEventsSupport());
  }, []);

  return isSupported;
}
