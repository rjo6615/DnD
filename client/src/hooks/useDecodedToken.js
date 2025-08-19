import { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import { jwtDecode as jwtDecodeNamed } from 'jwt-decode';
import useToken from '../useToken';

// Custom hook that retrieves a JWT from cookies via useToken,
// decodes it and returns the decoded payload. It gracefully
// handles missing or malformed tokens by returning null.
export default function useDecodedToken() {
  const { token } = useToken();
  const [decodedToken, setDecodedToken] = useState(null);

  useEffect(() => {
    if (!token) {
      setDecodedToken(null);
      return;
    }
    try {
      const decode = jwtDecode || jwtDecodeNamed;
      const decoded = decode(token);
      setDecodedToken(decoded);
    } catch (error) {
      console.error('Failed to decode token:', error);
      setDecodedToken(null);
    }
  }, [token]);

  return decodedToken;
}
