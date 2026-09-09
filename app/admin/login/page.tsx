'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff } from 'lucide-react';

// Dark photographic backdrops for the login — deterministic daily rotation
// from the free Picsum CDN (no key, fast, safe). A heavy dark overlay keeps
// text readable in both themes, and the page falls back to a near-black
// gradient if the image ever fails to load.
const BACKDROP_IDS = ['1018', '1036', '1019'];

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
    <div className="relative min-h-screen overflow-hidden bg-[#0b0e0c] px-4 py-8 text-foreground sm:px-6 sm:py-10">
      {/* Photographic backdrop — the glass card needs something real to frost */}
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-[#0b0e0c]">
        <img
          src={`https://picsum.photos/id/${BACKDROP_IDS[Math.floor(Date.now() / 86400000) % BACKDROP_IDS.length]}/1920/1080?grayscale`}
          alt=""
          className="h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/85" />
      </div>      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg items-center justify-center">
        <div className="relative w-full glass-strong rounded-[24px] p-7 ring-1 ring-white/25 sm:p-8">
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
                className="h-11 rounded-xl bg-background/70"
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
                  className="h-11 rounded-xl bg-background/70 pr-12"
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
              className="mt-1 h-11 w-full rounded-xl"
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
