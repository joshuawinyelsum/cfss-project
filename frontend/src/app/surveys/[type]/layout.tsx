export function generateStaticParams() {
  return [
    { type: 'household' },
    { type: 'education' },
    { type: 'health' },
    { type: 'governance' }
  ];
}

export default function SurveyTypeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
