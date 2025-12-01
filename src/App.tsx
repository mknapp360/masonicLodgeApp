// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import AccountSetup from './pages/AccountSetup';
import Events from './pages/Events';
import MyMeetings from './pages/MyMeetings';
import Login from './pages/Login';
import EventDetail from './pages/EventDetail';
import Profile from './pages/Profile';
import ProvincialAnalytics from './pages/ProvincialAnalytics';
import { initializePushNotifications } from './services/pushNotifications';

function App() {
  useEffect(() => {
    // Initialize push notifications when app loads
    initializePushNotifications();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-lodge-cream">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/account-setup" element={<AccountSetup />} />
          <Route path="/events" element={<Events />} />
          <Route path="/my-meetings" element={<MyMeetings />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/prov-analytics" element={<ProvincialAnalytics />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;