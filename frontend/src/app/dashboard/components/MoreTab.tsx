"use client";

import Link from '@/components/SpaLink';
import { Users, RefreshCw, User as UserIcon, Settings, ChevronRight } from 'lucide-react';

export default function MorePage() {
  const menuItems = [
    { name: 'My Group', href: '/dashboard/group', icon: Users, description: 'View your fieldwork group members' },
    { name: 'Sync & Activity', href: '/dashboard/sync', icon: RefreshCw, description: 'Manage offline synchronization' },
    { name: 'Profile', href: '/profile', icon: UserIcon, description: 'View your student profile' },
    { name: 'Settings', href: '/settings', icon: Settings, description: 'App preferences and configuration' },
  ];

  return (
    <div className="max-w-2xl mx-auto lg:hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">More</h1>
        <p className="text-sm text-muted mt-1">Secondary functions and settings</p>
      </div>

      <div className="bg-surface border border-border-strong rounded-xl overflow-hidden shadow-sm">
        {menuItems.map((item, index) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center p-4 hover:bg-page transition-colors ${
              index !== menuItems.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#093C22]/10 flex items-center justify-center shrink-0 mr-4">
              <item.icon size={20} className="text-[#093C22]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-primary">{item.name}</h3>
              <p className="text-xs text-muted mt-0.5">{item.description}</p>
            </div>
            <ChevronRight size={20} className="text-muted" />
          </Link>
        ))}
      </div>
      
      <div className="mt-8 text-center">
         <p className="text-xs text-muted">CFSS Fieldwork Application</p>
      </div>
    </div>
  );
}

