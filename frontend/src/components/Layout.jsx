import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  
  // Find group ID if present in the current route
  const pathParts = location.pathname.split('/');
  const isGroupView = pathParts[1] === 'groups';
  const groupId = isGroupView ? pathParts[2] : null;

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Dynamic Theme state and logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Helper to check active link
  const isActive = (path, tab = null) => {
    if (tab) {
      const searchParams = new URLSearchParams(location.search);
      return location.pathname === path && searchParams.get('tab') === tab;
    }
    return location.pathname === path && !location.search;
  };

  const handleLinkClick = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  // Profile Circle Initials
  const getInitials = (name) => {
    if (!name) return 'MA';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Sidebar Menu Configuration
  const menuItems = [
    {
      name: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      path: '/dashboard',
      enabled: true,
    },
    {
      name: 'Groups',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      path: '/dashboard',
      enabled: true,
    },
    {
      name: 'Expenses',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}` : '#',
      tab: 'expenses',
      enabled: !!groupId,
    },
    {
      name: 'Settlements',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}` : '#',
      tab: 'settlements',
      enabled: !!groupId,
    },
    {
      name: 'Members',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}` : '#',
      tab: 'members',
      enabled: !!groupId,
    },
    {
      name: 'Import CSV',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}/import` : '#',
      enabled: !!groupId,
    },
    {
      name: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}/import` : '#',
      enabled: !!groupId,
    },
    {
      name: 'Balances',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}` : '#',
      tab: 'traceability',
      enabled: !!groupId,
    },
    {
      name: 'Who Pays Whom',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}` : '#',
      tab: 'traceability',
      enabled: !!groupId,
    },
    {
      name: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}` : '#',
      enabled: !!groupId,
    },
    {
      name: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      path: groupId ? `/groups/${groupId}` : '#',
      enabled: !!groupId,
    },
  ];

  return (
    <div className="min-h-screen bg-darkBg text-white transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-darkCard border-r border-darkBorder z-30 hidden lg:flex flex-col justify-between">
        <div>
          {/* Logo Section */}
          <div className="h-16 flex items-center px-6 border-b border-darkBorder">
            <Link to="/dashboard" className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span className="h-8 w-8 bg-brandAccent rounded-lg flex items-center justify-center text-darkBg font-black">S</span>
              Shared Expenses <span className="text-brandAccent">Manager</span>
            </Link>
          </div>

          {/* Sidebar Menu Items */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item, index) => {
              const active = item.enabled && (item.tab ? isActive(item.path.split('?')[0], item.tab) : isActive(item.path));
              const dest = item.tab ? `${item.path}?tab=${item.tab}` : item.path;
              
              return item.enabled ? (
                <Link
                  key={index}
                  to={dest}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-brandAccent/10 text-brandAccent font-bold shadow-xs'
                      : 'text-gray-300 hover:bg-darkBg hover:text-white'
                  }`}
                >
                  <span className={`${active ? 'text-brandAccent' : 'text-gray-400'}`}>{item.icon}</span>
                  {item.name}
                </Link>
              ) : (
                <div
                  key={index}
                  title="Select a group first to access this tab"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed select-none"
                >
                  <span>{item.icon}</span>
                  {item.name}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Banner */}
        <div className="p-4 m-4 rounded-2xl bg-brandAccent/5 border border-brandAccent/10 flex gap-3">
          <div className="h-8 w-8 rounded-lg bg-brandAccent/10 flex items-center justify-center text-brandAccent flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Track. Split. Settle.</h5>
            <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Smart expense tracking made simple for flatmates.</p>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay background */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsMobileSidebarOpen(false)}></div>
          
          <aside className="relative w-64 bg-darkCard flex flex-col justify-between z-10 border-r border-darkBorder">
            <div>
              {/* Logo Section */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-darkBorder">
                <Link to="/dashboard" className="text-lg font-black tracking-tight text-white flex items-center gap-2" onClick={handleLinkClick}>
                  <span className="h-8 w-8 bg-brandAccent rounded-lg flex items-center justify-center text-darkBg font-black">S</span>
                  Expenses
                </Link>
                <button onClick={() => setIsMobileSidebarOpen(false)} className="text-gray-300 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Sidebar Menu Items */}
              <nav className="p-4 space-y-1">
                {menuItems.map((item, index) => {
                  const active = item.enabled && (item.tab ? isActive(item.path.split('?')[0], item.tab) : isActive(item.path));
                  const dest = item.tab ? `${item.path}?tab=${item.tab}` : item.path;
                  
                  return item.enabled ? (
                    <Link
                      key={index}
                      to={dest}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        active
                          ? 'bg-brandAccent/10 text-brandAccent font-bold'
                          : 'text-gray-300 hover:bg-darkBg hover:text-white'
                      }`}
                    >
                      <span className={`${active ? 'text-brandAccent' : 'text-gray-400'}`}>{item.icon}</span>
                      {item.name}
                    </Link>
                  ) : (
                    <div
                      key={index}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed select-none"
                    >
                      <span>{item.icon}</span>
                      {item.name}
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Bottom Banner */}
            <div className="p-4 m-4 rounded-2xl bg-brandAccent/5 border border-brandAccent/10 flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-brandAccent/10 flex items-center justify-center text-brandAccent flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Track. Split. Settle.</h5>
                <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Smart expense tracking made simple for flatmates.</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header Navigation Bar */}
        <header className="h-16 bg-darkCard border-b border-darkBorder sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-300 hover:text-white lg:hidden rounded-lg focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-sm font-bold text-gray-400 uppercase tracking-wider hidden lg:block">
              {isGroupView ? 'Group Dashboard' : 'Dashboard Overview'}
            </h1>

          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg focus:outline-none"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                /* Sun Icon */
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l.707.707M6.343 6.343l.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ) : (
                /* Moon Icon */
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            <button className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg relative">
              {/* Bell icon */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Green indicator dot */}
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-brandAccent ring-2 ring-darkCard"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brandAccent/20 rounded-full p-1 transition-all"
              >
                <div className="h-8 w-8 rounded-full bg-brandAccent flex items-center justify-center text-darkBg font-black tracking-wider shadow-sm shadow-brandAccent/15">
                  {getInitials(user?.name)}
                </div>
                <span className="text-sm font-semibold text-white hidden sm:block">{user?.name}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-darkCard border border-darkBorder shadow-lg rounded-xl py-1 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-darkBorder">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-darkBg hover:text-white transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
