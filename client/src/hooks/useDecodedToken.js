import { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';

// Custom hook that accepts a JWT token, decodes it and returns the payload.
// Returns null if no token is provided or the token cannot be decoded.
export default function useDecodedToken(token) {
  const [decodedToken, setDecodedToken] = useState(null);

  useEffect(() => {
    if (!token) {
      setDecodedToken(null);
      return;
    }
    try {
      const decoded = jwtDecode(token);
      setDecodedToken(decoded);
    } catch (error) {
      console.error('Failed to decode token:', error);
      setDecodedToken(null);
    }
  }, [token]);

  return decodedToken;
}
