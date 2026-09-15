"use client";

import Link from 'next/link';
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
        <h1 className="text-2xl font-bold text-gray-900">More</h1>
        <p className="text-sm text-gray-500 mt-1">Secondary functions and settings</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {menuItems.map((item, index) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${
              index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#093C22]/10 flex items-center justify-center shrink-0 mr-4">
              <item.icon size={20} className="text-[#093C22]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
        ))}
      </div>
      
      <div className="mt-8 text-center">
         <p className="text-xs text-gray-400">CFSS Fieldwork Application</p>
      </div>
    </div>
  );
}

