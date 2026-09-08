interface PageShellProps {
  children: React.ReactNode;
  variant?: 'narrow' | 'wide';
}

export function PageShell({ children, variant = 'narrow' }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={`mx-auto px-4 py-6 ${variant === 'wide' ? 'max-w-4xl' : 'max-w-md'}`}>
        {children}
      </div>
    </div>
  );
}
