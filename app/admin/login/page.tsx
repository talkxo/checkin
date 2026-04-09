'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff } from 'lucide-react';

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
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <motion.div
          className="absolute -left-24 -top-20 h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle_at_center,_#67dfc2_0%,_transparent_72%)] opacity-45 blur-2xl"
          animate={{ x: [0, 180, 80], y: [0, 120, 220] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-28 -top-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,_#67d9d5_0%,_transparent_72%)] opacity-45 blur-2xl"
          animate={{ x: [0, -170, -40], y: [0, 140, 240] }}
          transition={{ duration: 13, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/3 -bottom-44 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_#59d6b8_0%,_transparent_72%)] opacity-40 blur-2xl"
          animate={{ x: [0, 120, -120], y: [0, -180, -40] }}
          transition={{ duration: 14, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg items-center justify-center">
        <div className="relative w-full rounded-[24px] border border-primary/25 bg-gradient-to-b from-primary/10 via-card/90 to-card/85 p-7 shadow-2xl shadow-primary/15 backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-center">
            <img
              src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png"
              alt="INSYDE"
              className="h-10 w-10 object-contain"
            />
          </div>

          <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.01em] text-foreground sm:text-[2.15rem]">
            Run admin operations from one focused workspace.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sign in to manage people, attendance, and leave with clear operational context.
          </p>

          <div className="my-6 h-px bg-primary/15" />

          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Admin Access</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              className="mt-1 h-11 w-full rounded-xl bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
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
