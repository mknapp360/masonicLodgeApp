// src/pages/Profile.tsx - UPDATED VERSION WITH SIDEBAR
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { User, Mail, Phone, Shield } from 'lucide-react';
import AppLayout from '../components/AppLayout';

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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-masonic-blue mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!currentMember) {
    return null; // Will redirect to login
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="bg-masonic-blue text-white p-6 lg:p-8">
        <h1 className="text-2xl lg:text-3xl font-bold">Profile</h1>
        <p className="text-blue-200 mt-1">Your member information</p>
      </div>

      <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-masonic-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentMember.masonic_rank} {currentMember.first_name} {currentMember.last_name}
              </h2>
              {currentMember.masonic_rank && (
                <p className="text-gray-600 mt-1">{currentMember.masonic_rank}</p>
              )}
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-6">
              {currentMember.email && (
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{currentMember.email}</p>
                  </div>
                </div>
              )}

              {currentMember.phone && (
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{currentMember.phone}</p>
                  </div>
                </div>
              )}

              {currentMember.primary_lodge_id && (
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <Shield className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Primary Lodge</p>
                    <p className="text-gray-900">Lodge Member</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;