export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-primary">Work</h1>
        <p className="text-sm text-muted mt-1">Your fieldwork in one place.</p>
      </div>
      {children}
    </div>
  );
}
