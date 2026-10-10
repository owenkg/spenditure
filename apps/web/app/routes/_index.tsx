import { useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { isAuthenticated } from '~/lib/api';

export default function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(isAuthenticated() ? '/dashboard' : '/auth/pin', { replace: true });
  }, [navigate]);
  return null;
}
