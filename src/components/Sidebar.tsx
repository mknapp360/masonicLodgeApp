// src/components/Sidebar.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  LogOut, 
  ChevronLeft, 
  Menu,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Wine,
  Music
} from 'lucide-react';
import { signOut } from '../services/auth';

interface SidebarProps {
  currentMember?: {
    masonic_rank?: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

interface MenuItem {
  icon: any;
  label: string;
  path?: string;
  submenu?: SubMenuItem[];
}

interface SubMenuItem {
  icon: any;
  label: string;
  path: string;
}

const Sidebar = ({ currentMember }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    { icon: Calendar,
      label: 'Meetings',
      submenu: [
        { icon: Wine, label: 'My Booked Meetings', path: '/my-meetings' },
        { icon: Wine, label: 'Find a Meeting', path: '/events' },
      ]
    },
    { 
      icon: Briefcase, 
      label: 'Meeting Assistance',
      submenu: [
        { icon: Wine, label: 'Toast Lists', path: '/toast-lists' },
        { icon: Music, label: 'Lodge Music', path: '/lodge-music' },
      ]
    },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const toggleSubmenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false); // Close menu on mobile after navigation
  };

  return (
    <>
      {/* Mobile Menu Button - Fixed top-left */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-masonic-blue text-white rounded-lg shadow-lg hover:bg-blue-900 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-64
        `}
      >
        {/* Header - matches main page header height */}
        <div className="h-[68px] flex items-center justify-between px-4 bg-masonic-blue text-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-masonic-blue font-bold text-sm">SM</span>
            </div>
            <span className="font-semibold">Sussex Masons</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 hover:bg-blue-800 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        {currentMember && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-masonic-blue rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentMember.masonic_rank} {currentMember.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentMember.first_name} {currentMember.last_name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedMenus.includes(item.label);
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            
            // For items with submenus
            if (hasSubmenu) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleSubmenu(item.label)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {/* Submenu items */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.submenu!.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isActive = location.pathname === subItem.path;
                        
                        return (
                          <button
                            key={subItem.path}
                            onClick={() => handleNavigation(subItem.path)}
                            className={`
                              w-full flex items-center space-x-3 px-3 py-2 rounded-lg
                              transition-colors
                              ${isActive 
                                ? 'bg-masonic-blue text-white' 
                                : 'text-gray-600 hover:bg-gray-100'
                              }
                            `}
                          >
                            <SubIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            // For regular menu items without submenus
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path!)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-lg
                  transition-colors
                  ${isActive 
                    ? 'bg-masonic-blue text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;