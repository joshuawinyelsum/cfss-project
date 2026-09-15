import re

with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of navItems
start_idx = content.find("  const primaryNavItems = [")
if start_idx == -1:
    start_idx = content.find("  const navItems = [")

new_jsx = """  const primaryNavItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Work', href: '/dashboard/surveys/drafts', icon: FileEdit, badge: draftCount > 0 ? draftCount : undefined },
    { name: 'Collect', href: '/surveys', icon: ClipboardList, prominent: true },
    { name: 'Submitted', href: '/dashboard/surveys/submitted', icon: CheckSquare },
  ];

  const secondaryNavItems = [
    { name: 'My Group', href: '/dashboard/group', icon: Users },
    { name: 'Sync & Activity', href: '/dashboard/sync', icon: RefreshCw },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const mobileNavItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Work', href: '/dashboard/surveys/drafts', icon: FileEdit, badge: draftCount > 0 ? draftCount : undefined },
    { name: 'Collect', href: '/surveys', icon: ClipboardList, prominent: true },
    { name: 'Submitted', href: '/dashboard/surveys/submitted', icon: CheckSquare },
    { name: 'More', href: '/dashboard/more', icon: MoreHorizontal },
  ];

  if (!user) return null;

  if (!hydrated || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#093C22] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 z-10">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-[#093C22] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-gray-900">CFSS</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Fieldwork Workspace</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="text-xs font-semibold text-gray-400 mb-2 px-3 uppercase tracking-wider">Fieldwork</div>
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#093C22]/10 text-[#093C22]' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-[#093C22]' : 'text-gray-400'} />
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-[#093C22] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="text-xs font-semibold text-gray-400 mt-8 mb-2 px-3 uppercase tracking-wider">Account & System</div>
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#093C22]/10 text-[#093C22]' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-[#093C22]' : 'text-gray-400'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Sync Status</h3>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'Online' && !isSyncing ? 'bg-green-500' : isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isSyncing ? 'Syncing...' : syncStatus}
            </div>
            <p className="text-[10px] text-gray-500 mb-3">Last sync: {lastSyncText}</p>
            <button 
              className={`w-full py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors flex items-center justify-center gap-2 ${isSyncing || syncStatus === 'Offline' ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!isSyncing && token && syncStatus === 'Online') {
                  setIsSyncing(true);
                  syncEngine.processQueue(token).finally(() => setIsSyncing(false));
                }
              }}
              disabled={isSyncing || syncStatus === 'Offline'}
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#093C22] rounded flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">CFSS Workspace</span>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1">
               <span className={`w-2 h-2 rounded-full ${syncStatus === 'Online' && !isSyncing ? 'bg-green-500' : isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
             </div>
             <div className="w-8 h-8 rounded-full bg-[#093C22]/10 text-[#093C22] flex items-center justify-center font-bold text-sm shrink-0">
                {user.full_name.charAt(0)}
             </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-24 lg:pb-4 lg:p-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-16 z-50 pb-safe">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
            
            if (item.prominent) {
               return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex flex-col items-center justify-center -mt-5 relative z-10"
                  >
                    <div className="w-12 h-12 bg-[#093C22] rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 text-white">
                      <item.icon size={22} />
                    </div>
                    <span className="text-[10px] font-medium text-gray-600 mt-1">{item.name}</span>
                  </Link>
               );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-16 h-full relative"
              >
                <item.icon 
                  size={22} 
                  className={`mb-1 ${isActive ? 'text-[#093C22]' : 'text-gray-400'}`} 
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#093C22]' : 'text-gray-500'}`}>
                  {item.name}
                </span>
                {item.badge && (
                  <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
"""

content = content[:start_idx] + new_jsx

with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
