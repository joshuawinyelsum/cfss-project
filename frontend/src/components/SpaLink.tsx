"use client";

import { useDashboardStore } from '@/lib/store';

export default function SpaLink({ href, children, className, ...props }: any) {
  const setActiveTab = useDashboardStore(state => state.setActiveTab);
  const startSurvey = useDashboardStore(state => state.startSurvey);
  
  const handleClick = (e: any) => {
    e.preventDefault();
    if (href === '/dashboard') setActiveTab('home');
    else if (href === '/dashboard/work') setActiveTab('work');
    else if (href === '/surveys') setActiveTab('collect');
    else if (href === '/dashboard/surveys/drafts') setActiveTab('work');
    else if (href === '/dashboard/surveys/submitted') setActiveTab('submitted');
    else if (href === '/dashboard/sync') setActiveTab('sync');
    else if (href === '/dashboard/group') setActiveTab('group');
    else if (href === '/dashboard/more') setActiveTab('more');
    else if (href === '/profile') setActiveTab('profile');
    else if (href === '/settings') setActiveTab('settings');
    else if (href.includes('/fill') || href.includes('/view')) {
       const parts = href.split('/');
       const type = parts[2];
       const idMatch = href.match(/id=([^&]+)/);
       let id;
       
       if (idMatch) {
         id = idMatch[1];
       } else {
         // might be path parameter /fill/123
         id = parts[parts.length - 1];
       }
       
       startSurvey(type, id);
    }
    // Fallback for unhandled routes, could push state or just log
  };

  // We render a generic div/a/button that accepts className
  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
