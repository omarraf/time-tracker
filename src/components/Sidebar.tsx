import { useState } from 'react';
import { signOutUser } from '../auth';
import type { NavRoute } from '../types/schedule';

interface SidebarProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  userEmail?: string | null;
}

const handleSignOut = async () => {
  if (confirm('Are you sure you want to sign out?')) {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out');
    }
  }
};

export default function Sidebar({ currentRoute, onNavigate, userEmail }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: Array<{ route: NavRoute; icon: string; label: string }> = [
    { route: 'dashboard', icon: '■', label: 'Dashboard' },
    { route: 'schedules', icon: '☰', label: 'Schedules' },
    { route: 'templates', icon: '◫', label: 'Templates' },
    { route: 'history', icon: '◷', label: 'History' },
    { route: 'analytics', icon: '◔', label: 'Analytics' },
    { route: 'settings', icon: '◐', label: 'Settings' },
  ];

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo/Brand & Toggle */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-gray-900">DayChart</h1>
            <p className="text-xs text-gray-500">Time Manager</p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.route}
            onClick={() => onNavigate(item.route)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
              ${currentRoute === item.route
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? item.label : ''}
          >
            <span className="text-lg">{item.icon}</span>
            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Info */}
      {userEmail && (
        <div className="p-3 border-t border-gray-200 space-y-2">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
