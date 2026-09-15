import re
with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
import_lucide = re.search(r"import \{([^}]+)\} from 'lucide-react';", content).group(1)
if 'HelpCircle' not in import_lucide:
    content = content.replace("import {", "import { HelpCircle, ArrowRight, Plus, RefreshCw, ", 1)
new_return = """  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-[#0a4628] to-[#052b18] text-white shrink-0 z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#0a4628] font-bold text-xl">C</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CFSS</h1>
            <p className="text-[10px] text-emerald-100/80 leading-tight">Community Field<br/>Survey System</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={lex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors }
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-emerald-100/70'} />
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors w-full"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Right Drawer ("More") */}
      <aside 
        className={ixed inset-y-0 right-0 z-50 w-72 bg-white flex flex-col transition-transform duration-300 ease-in-out lg:hidden shadow-2xl }
      >
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
               {user.full_name.charAt(0)}
             </div>
             <div>
               <h3 className="font-bold text-gray-900 text-sm leading-tight">{user.full_name}</h3>
               <p className="text-xs text-gray-500">Group {user.group_number || 'Pending'}</p>
             </div>
          </div>
          <button 
            className="text-gray-400 hover:text-gray-600 p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-2">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-2">Account & Context</h4>
          <Link href="/dashboard/group" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 active:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3"><Users size={20} className="text-gray-400" /><span className="text-sm font-semibold text-gray-700">My Group</span></div>
            <ArrowRight size={16} className="text-gray-300" />
          </Link>
          <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 active:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3"><UserIcon size={20} className="text-gray-400" /><span className="text-sm font-semibold text-gray-700">Profile</span></div>
            <ArrowRight size={16} className="text-gray-300" />
          </Link>
          
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-2">System</h4>
          <Link href="/dashboard/sync" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 active:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3"><RefreshCw size={20} className={isSyncing ? "text-emerald-500 animate-spin" : "text-gray-400"} /><span className="text-sm font-semibold text-gray-700">Sync & Activity</span></div>
            <div className="flex items-center gap-2">
               <span className={w-2 h-2 rounded-full }></span>
               <ArrowRight size={16} className="text-gray-300" />
            </div>
          </Link>
          <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 active:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3"><Settings size={20} className="text-gray-400" /><span className="text-sm font-semibold text-gray-700">Settings</span></div>
            <ArrowRight size={16} className="text-gray-300" />
          </Link>
          <Link href="#" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 active:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3"><HelpCircle size={20} className="text-gray-400" /><span className="text-sm font-semibold text-gray-700">Help</span></div>
            <ArrowRight size={16} className="text-gray-300" />
          </Link>
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-colors w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Desktop Header / Minimal Mobile Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center">
            {/* Desktop only branding here since sidebar has the main branding, but we keep CFSS for mobile */}
            <span className="lg:hidden font-bold text-gray-900 text-lg">CFSS Fieldwork</span>
          </div>

          <div className="flex items-center gap-4 lg:gap-6 ml-auto">
            <button className="hidden lg:block relative text-gray-500 hover:text-gray-700">
              <Bell size={20} />
            </button>
            
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                {user.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-none">{user.full_name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Level 100   Group {user.group_number || 'Pending'} {user.community ?    : ''}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-24 lg:p-8 lg:pb-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-1 pb-4 pt-1 h-[68px] z-40">
          <Link href="/dashboard" className={lex flex-col items-center justify-center w-1/5 h-full rounded-xl transition-colors }>
            <Home size={22} className={pathname === '/dashboard' ? 'fill-emerald-100' : ''} />
            <span className="text-[10px] mt-1 font-semibold">Home</span>
          </Link>
          <Link href="/dashboard/work" className={lex flex-col items-center justify-center w-1/5 h-full rounded-xl transition-colors relative }>
            <FileEdit size={22} className={pathname.includes('/dashboard/work') ? 'fill-emerald-100' : ''} />
            <span className="text-[10px] mt-1 font-semibold">Work</span>
            {draftCount > 0 && (
              <span className="absolute top-0.5 right-2 w-3 h-3 bg-amber-500 border-2 border-white rounded-full"></span>
            )}
          </Link>
          <Link href="/surveys" className={lex flex-col items-center justify-center w-1/5 h-full rounded-xl transition-colors }>
            <div className="bg-emerald-600 text-white p-2 rounded-full shadow-md mb-0.5 transform -translate-y-2 border-4 border-white">
              <Plus size={20} />
            </div>
            <span className="text-[10px] font-semibold">Collect</span>
          </Link>
          <Link href="/dashboard/surveys/submitted" className={lex flex-col items-center justify-center w-1/5 h-full rounded-xl transition-colors }>
            <CheckSquare size={22} className={pathname.includes('/submitted') ? 'fill-emerald-100' : ''} />
            <span className="text-[10px] mt-1 font-semibold">Submitted</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(true)} className={lex flex-col items-center justify-center w-1/5 h-full rounded-xl transition-colors }>
            <Menu size={22} />
            <span className="text-[10px] mt-1 font-semibold">More</span>
          </button>
        </div>
      </div>

    </div>
  );
}
"""
content = re.sub(r'  return \(\s*<div className="flex h-screen bg-gray-50 overflow-hidden font-sans">.*', new_return, content, flags=re.DOTALL)
with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated layout.tsx")
