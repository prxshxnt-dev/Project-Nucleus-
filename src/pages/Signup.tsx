import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center p-8">
        <p className="text-[#7A7A7A] text-sm animate-pulse">Redirecting to classroom portal login...</p>
      </div>
    </div>
  );
}
