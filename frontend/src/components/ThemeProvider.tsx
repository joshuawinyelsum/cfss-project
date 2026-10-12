"use client";

import { useEffect } from 'react';
import { useAuthStore, useAdminAuthStore } from '@/lib/store';
import { usePathname } from 'next/navigation';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  
  const studentTheme = useAuthStore((s) => s.theme);
  const adminTheme = useAdminAuthStore((s) => s.theme);
  const currentTheme = isAdmin ? adminTheme : studentTheme;

  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'system') {
        isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = false;
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme(currentTheme || 'light');

    if (currentTheme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [currentTheme, isAdmin]);

  return <>{children}</>;
}

