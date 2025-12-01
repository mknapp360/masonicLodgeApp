// src/components/AppLayout.tsx
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { getCurrentUser } from '../services/auth';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) {
          navigate('/');
          return;
        }
        setCurrentMember(userData.member);
      } catch (error) {
        console.error('Failed to load user:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-masonic-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentMember={currentMember} />
      
      {/* Main content area - offset by sidebar width on desktop */}
      <main className="lg:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;