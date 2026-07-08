"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, mounted]);

  // Prevent hydration mismatch by not rendering until mounted if needed
  // But returning children directly is usually fine for just applying classes to html
  
  return <>{children}</>;
}
