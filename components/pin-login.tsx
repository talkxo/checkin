"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Colorful high-contrast workspace/people backdrops for the PIN login —
// Unsplash CDN (free, fast, no key), daily rotation. A moderate dark overlay
// keeps the photo visible while the glass card frosts it.
// 4K-grade wallpaper classics (Unsplash) — exact crop to the screen, so the
// photo always fills with zero letterboxing. Deterministic daily rotation.
const BACKDROPS = [
  "photo-1506905925346-21bda4d32df4", // mountain peak at dusk
  "photo-1557682250-33bd709cbe85", // purple gradient wave
  "photo-1470071459604-3b5ec3a7fe05", // foggy mountain layers
  "photo-1550684376-efcbd6e3f031", // abstract blue paint wave
  "photo-1444703686981-a3abbc4d4fe3", // milky way
];
const backdropUrl = `https://images.unsplash.com/${BACKDROPS[Math.floor(Date.now() / 86400000) % BACKDROPS.length]}?auto=format&fit=crop&w=1170&h=2532&q=90`;

interface Employee {
  id: string;
  full_name: string;
  slug: string;
  email?: string;
}

interface PinLoginProps {
  onLoginSuccess: (employee: Employee, pinChangeRequired?: boolean) => void;
}

export default function PinLogin({ onLoginSuccess }: PinLoginProps) {
  const [username, setUsername] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Employee[]>([]);
  const [isPinFocused, setIsPinFocused] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const searchEmployees = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/employees?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (searchError) {
      console.error("Error searching employees:", searchError);
      setSuggestions([]);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setError("");

    if (showPinInput) {
      setShowPinInput(false);
      setPinValue("");
    }

    if (value.length >= 2) {
      searchEmployees(value);
      return;
    }

    setSuggestions([]);
  };

  const handleUsernameSubmit = (usernameOverride?: string) => {
    const nextUsername = (usernameOverride ?? username).trim();

    if (!nextUsername) {
      setError("Please enter your username");
      return;
    }

    setUsername(nextUsername);
    setSuggestions([]);
    setError("");
    setPinValue("");
    setShowPinInput(true);
  };

  const handlePinSubmit = async (pinOverride?: string) => {
    const fullPin = pinOverride ?? pinValue;

    if (fullPin.length !== 4) {
      setError("Please enter a 4-digit PIN");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin: fullPin }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.employee, data.pin_change_required);
        return;
      }

      setError(data.error || "Invalid username or PIN");
      setPinValue("");
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } catch (loginError) {
      console.error("Login error:", loginError);
      setError("Network error. Please try again.");
      setPinValue("");
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPinValue(digits);
    setError("");

    if (digits.length === 4) {
      setTimeout(() => handlePinSubmit(digits), 150);
    }
  };

  useEffect(() => {
    if (!showPinInput) {
      usernameInputRef.current?.focus();
      return;
    }

    const timeoutId = window.setTimeout(() => pinInputRef.current?.focus(), 100);
    return () => window.clearTimeout(timeoutId);
  }, [showPinInput]);

  return (
    <>
      {/* Photographic backdrop — the glass card needs something colorful to frost */}
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-[#0e1113]">
        <img
          src={backdropUrl}
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/45" />
      </div>

      <div className="glass-strong relative z-10 rounded-3xl p-8 ring-1 ring-white/25">
      <div className="space-y-6">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center">
            <img
              src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png"
              alt="insyde"
              className="h-8 w-8 object-contain"
            />
          </div>
        </div>

        {!showPinInput ? (
          <div className="space-y-4">
            <Input
              ref={usernameInputRef}
              type="text"
              value={username}
              placeholder="Enter your username"
              className="w-full rounded-lg border-2 border-border bg-background px-4 py-6 text-center text-lg text-foreground selection:bg-primary/20 selection:text-foreground"
              onChange={(event) => handleUsernameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleUsernameSubmit();
                }
              }}
              autoFocus
            />

            {suggestions.length > 0 && (
              <div className="relative">
                <div className="absolute z-10 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                  {suggestions.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      className="w-full px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
                      onClick={() => handleUsernameSubmit(employee.full_name)}
                    >
                      {employee.full_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="button"
              onClick={() => handleUsernameSubmit()}
              disabled={!username.trim() || isLoading}
              className="h-14 w-full rounded-lg text-lg font-semibold"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-primary-foreground" />
                  Loading...
                </span>
              ) : (
                "Next"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2
                className="mb-2 text-3xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-playfair-display), serif" }}
              >
                What&apos;s up, {username.split(" ")[0]}!
              </h2>
              <p className="text-sm text-muted-foreground">
                Still remember that knock-knock combination we agreed on?
              </p>
            </div>

            <div className="relative">
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={pinValue}
                onChange={(event) => handlePinChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && pinValue.length === 4) {
                    handlePinSubmit();
                  }
                }}
                onFocus={() => setIsPinFocused(true)}
                onBlur={() => setIsPinFocused(false)}
                className="absolute inset-0 opacity-0"
                aria-label="4-digit PIN"
                autoFocus
              />

              <button
                type="button"
                onClick={() => pinInputRef.current?.focus()}
                className="w-full"
              >
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = index < pinValue.length;
                    const isActive =
                      isPinFocused &&
                      (index === pinValue.length || (pinValue.length === 4 && index === 3));

                    return (
                      <div
                        key={index}
                        className={`flex h-16 w-16 items-center justify-center rounded-lg border-2 bg-background text-2xl font-semibold transition-colors ${
                          isActive
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border"
                        }`}
                      >
                        <span className="text-foreground">{isFilled ? "•" : ""}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => handlePinSubmit()}
                disabled={pinValue.length !== 4 || isLoading}
                className="h-14 w-full rounded-lg text-lg font-semibold"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-primary-foreground" />
                    Verifying...
                  </span>
                ) : (
                  "Login"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setShowPinInput(false);
                  setPinValue("");
                  setError("");
                }}
                className="w-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Change username
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
