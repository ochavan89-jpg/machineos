import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING = 5 * 60 * 1000;  // 5 minutes warning

const useSessionTimeout = () => {
  const navigate = useNavigate();
  
  const logout = useCallback(() => {
    localStorage.removeItem('machineos_user');
    localStorage.removeItem('machineos_token');
    localStorage.removeItem('machineos_refresh_token');
    alert('Session expired! Please login again.');
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    let timer, warningTimer;
    
    const reset = () => {
      clearTimeout(timer);
      clearTimeout(warningTimer);
      warningTimer = setTimeout(() => {
        alert('⚠️ Session expire होणार आहे 5 minutes मध्ये! Activity करा.');
      }, TIMEOUT - WARNING);
      timer = setTimeout(logout, TIMEOUT);
    };

    const events = ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();

    return () => {
      clearTimeout(timer);
      clearTimeout(warningTimer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [logout]);
};

export default useSessionTimeout;