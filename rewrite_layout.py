import re

with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_return = '''  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Work', href: '/dashboard/work', icon: FileEdit, badge: draftCount > 0 ? draftCount : undefined },
    { name: 'Collect', href: '/surveys', icon: Plus },
    { name: 'Submitted', href: '/dashboard/surveys/submitted', icon: CheckSquare },
  ];

  const moreItems = [
    { name: 'My Group', href: '/dashboard/group', icon: Users },
    { name: 'Sync & Activity', href: '/dashboard/sync', icon: RefreshCw },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Help', href: '#', icon: HelpCircle },
  ];

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-slate-800">
      
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop (Left) / Mobile (Right Drawer) */}
      <aside className={
        fixed lg:static inset-y-0 right-0 z-50 w-72 bg-white border-l lg:border-l-0 lg:border-r border-gray-200 
        transform transition-transform duration-200 ease-in-out flex flex-col
         + "" + 
      }>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-700 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="font-semibold tracking-tight text-slate-900">CFSS Fieldwork</span>
          </div>
          <button 
            className="lg:hidden text-gray-400 hover:text-gray-600 p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          
          {/* Primary Nav (Desktop Only) */}
          <div className="hidden lg:block space-y-1">
            {navItems.map(item => (
              <Link 
                key={item.href} 
                href={item.href}
                className={lex items-center justify-between px-3 py-2.5 rounded-lg transition-colors  + " + "}" + }
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={
                    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                      ? 'text-emerald-700' 
                      : 'text-slate-400'
                  } />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Secondary Nav (Desktop + Mobile Drawer) */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">More</h4>
            {moreItems.map(item => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 hover:bg-gray-50 hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={
                     + "" + 
                  } />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.name === 'Sync & Activity' && (
                  <div className="flex items-center gap-2">
                     <span className={w-2 h-2 rounded-full  + "" + }></span>
                  </div>
                )}
              </Link>
            ))}
          </div>

        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors w-full"
          >
            <LogOut size={18} className="text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Mobile Minimal Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-base tracking-tight">{user.full_name}</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
            {user.full_name.charAt(0)}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex bg-white border-b border-gray-200 h-16 items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 text-sm text-slate-500">
             <span>{user.community || 'No Community'}</span>
             <span className="w-1 h-1 rounded-full bg-slate-300"></span>
             <span>Group {user.group_number || 'Pending'}</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 leading-none">{user.full_name}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                {user.full_name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-24 lg:p-8 lg:pb-8">
          <div className="max-w-4xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-2 pb-safe pt-2 h-16 z-40">
          <Link href="/dashboard" className={lex flex-col items-center justify-center w-1/5 h-full transition-colors  + "" + }>
            <Home size={22} className={pathname === '/dashboard' ? 'stroke-2' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </Link>
          <Link href="/dashboard/work" className={lex flex-col items-center justify-center w-1/5 h-full transition-colors relative  + "" + }>
            <FileEdit size={22} className={pathname.includes('/dashboard/work') ? 'stroke-2' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-medium">Work</span>
            {draftCount > 0 && (
              <span className="absolute top-1 right-3 w-2 h-2 bg-amber-500 rounded-full border border-white"></span>
            )}
          </Link>
          <Link href="/surveys" className="flex flex-col items-center justify-center w-1/5 h-full transition-colors text-emerald-700">
            <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg mb-0.5">
              <Plus size={22} className="stroke-2" />
            </div>
            <span className="text-[10px] font-medium">Collect</span>
          </Link>
          <Link href="/dashboard/surveys/submitted" className={lex flex-col items-center justify-center w-1/5 h-full transition-colors  + "" + }>
            <CheckSquare size={22} className={pathname.includes('/submitted') ? 'stroke-2' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-medium">Submitted</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(true)} className={lex flex-col items-center justify-center w-1/5 h-full transition-colors  + "" + }>
            <Menu size={22} className={isMobileMenuOpen ? 'stroke-2' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </div>

    </div>
  );
}
'''

content = re.sub(r'  const navItems = \[.*$', new_return, content, flags=re.DOTALL | re.MULTILINE)
with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated layout")
