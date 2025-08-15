import { useState } from 'react';

export default function useToken() {
  const [token, setToken] = useState(null);

  const saveToken = (userToken) => {
    setToken(userToken);
  };

  const removeToken = () => {
    setToken(null);
  };

  return {
    setToken: saveToken,
    token,
    removeToken,
  };
}
