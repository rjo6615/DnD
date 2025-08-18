import { useState } from 'react';

export default function useToken() {
  const cookieName = 'tokenFront';
  const getToken = () => {
    const match = document.cookie.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
    return match ? match[2] : null;
  };

  const [token, setToken] = useState(getToken());

  const saveToken = (userToken) => {
    document.cookie = `${cookieName}=${userToken}; path=/`;
    setToken(userToken);
  };

  const removeToken = () => {
    document.cookie = `${cookieName}=; Max-Age=0; path=/`;
    setToken(null);
  };

  return {
    setToken: saveToken,
    token,
    removeToken,
  };
}
