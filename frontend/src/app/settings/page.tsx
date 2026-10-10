"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="w-8 h-8 border-4 border-[#093C22] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
