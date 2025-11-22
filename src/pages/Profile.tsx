// src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, signOut } from '../services/auth';
import { ArrowLeft, User, Mail, Phone, LogOut } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) {
          navigate('/');
          return;
        }
        setCurrentMember(userData.member);
      } catch (error) {
        console.error('Failed to load profile:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-masonic-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!currentMember) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-masonic-blue text-white p-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/events')} className="mr-3 p-1 hover:bg-blue-800 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-masonic-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentMember?.masonic_rank} {currentMember?.first_name} {currentMember?.last_name}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-gray-700">
              <Mail className="w-5 h-5 mr-3" />
              <span>{currentMember?.email}</span>
            </div>
            
            {currentMember?.phone && (
              <div className="flex items-center text-gray-700">
                <Phone className="w-5 h-5 mr-3" />
                <span>{currentMember.phone}</span>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;