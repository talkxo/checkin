'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

function AdminLoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          redirectTo 
        })
      });

      if (response.ok) {
        // Redirect to the intended page
        router.push(redirectTo);
      } else {
        const data = await response.json();
        setError(data.error || 'Login failed');
        setIsLoading(false);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-2xl shadow-primary/10 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="hidden border-r border-border/50 bg-gradient-to-br from-primary/12 via-background to-background p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">INSYDE Admin</p>
                  <p className="text-sm text-muted-foreground">Operational access for people, attendance, and leave.</p>
                </div>
              </div>
              <div className="mt-14 space-y-4">
                <h1 className="text-4xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
                  Run the team from one calm workspace.
                </h1>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Sign in to review live attendance, resolve exceptions, and manage leave without switching tools.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Security Note</p>
              <p className="mt-2 text-sm text-foreground">
                Admin access is restricted. Use named credentials only and avoid sharing credentials across devices.
              </p>
            </div>
          </div>
          <div className="p-6 sm:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">INSYDE Admin</p>
                  <p className="text-sm text-muted-foreground">Operational access</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="mb-4 flex items-center justify-center lg:hidden">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png"
                      alt="insyde"
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                </div>
                <h2 className="text-3xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
                  Admin Access
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your credentials to access admin features.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-foreground">
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    disabled={isLoading}
                    className="h-11 rounded-xl border-border/60 bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="h-11 rounded-xl border-border/60 bg-background pr-12"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      disabled={isLoading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Input
                  tabIndex={-1}
                  aria-hidden="true"
                  className="hidden"
                />
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading || !username.trim() || !password.trim()}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary-foreground"></div>
                      <span>Signing in…</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Sign In</span>
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-xs text-muted-foreground">
                <p>Forgot the credentials? Contact dev at TalkXO.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
