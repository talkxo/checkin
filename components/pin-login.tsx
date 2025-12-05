"use client";

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPinInput, setShowPinInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Search employees for autocomplete
  const searchEmployees = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const r = await fetch(`/api/employees?q=${encodeURIComponent(query)}`);
      const data = await r.json();
      setSuggestions(data);
    } catch (e) {
      console.error('Error searching employees:', e);
      setSuggestions([]);
    }
  };

  // Handle username input change
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setError('');
    setSuggestions([]);
    if (showPinInput) {
      setShowPinInput(false);
      setPin(['', '', '', '']);
    }
    if (value.length >= 2) {
      searchEmployees(value);
    }
  };

  // Handle username selection from suggestions
  const handleUsernameSelect = (employee: any) => {
    setUsername(employee.full_name);
    setSuggestions([]);
    setError('');
  };

  // Handle username submit (move to PIN input)
  const handleUsernameSubmit = () => {
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    setError('');
    setShowPinInput(true);
    // Focus PIN input after a brief delay
    setTimeout(() => {
      pinInputRefs[0].current?.focus();
    }, 100);
  };

  // Handle PIN input change for individual digit
  const handlePinDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError('');
    
    // Auto-focus next input if digit entered
    if (digit && index < 3) {
      setTimeout(() => {
        pinInputRefs[index + 1].current?.focus();
      }, 10);
    }
    
    // Auto-submit when all 4 digits are entered
    if (digit && index === 3) {
      const fullPin = newPin.join('');
      if (fullPin.length === 4) {
        setTimeout(() => handlePinSubmit(), 100);
      }
    }
  };

  // Handle backspace to move to previous input
  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  // Handle PIN submit
  const handlePinSubmit = async () => {
    const fullPin = pin.join('');
    if (!fullPin || fullPin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin: fullPin })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - call callback with employee data and pin_change_required flag
        onLoginSuccess(data.employee, data.pin_change_required);
      } else {
        // Error
        setError(data.error || 'Invalid username or PIN');
        setPin(['', '', '', '']);
        // Refocus first PIN input
        setTimeout(() => {
          pinInputRefs[0].current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
      setPin(['', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back button (return to username input)
  const handleBack = () => {
    setShowPinInput(false);
    setPin(['', '', '', '']);
    setError('');
    setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 100);
  };

  // Auto-focus username input on mount or first PIN input when showing PIN
  useEffect(() => {
    if (!showPinInput) {
      usernameInputRef.current?.focus();
    } else {
      // Focus first PIN input when PIN section is shown
      setTimeout(() => {
        pinInputRefs[0].current?.focus();
      }, 100);
    }
  }, [showPinInput]);

  return (
    <div className="bg-card dark:bg-card rounded-2xl elevation-lg p-8 slide-up">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-8 h-8 flex items-center justify-center">
            <img 
              src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png" 
              alt="insyde" 
              className="w-8 h-8 object-contain"
            />
          </div>
        </div>

        {/* Username Input Section */}
        {!showPinInput ? (
          <div className="space-y-4">
            <div>
              <Input
                ref={usernameInputRef}
                type="text"
                className="w-full px-4 py-6 text-center text-lg border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-border dark:border-border bg-background dark:bg-background text-foreground dark:text-foreground selection:bg-primary/20 selection:text-foreground"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleUsernameSubmit();
                  }
                }}
                autoFocus
              />
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="relative">
                <div className="absolute z-10 w-full bg-card dark:bg-card rounded-md elevation-lg border border-border dark:border-border max-h-48 overflow-y-auto">
                  {suggestions.map((emp) => (
                    <button
                      key={emp.id}
                      className="w-full text-left px-4 py-3 hover:bg-muted dark:hover:bg-muted focus:bg-muted dark:focus:bg-muted focus:outline-none transition-colors text-sm text-foreground dark:text-foreground"
                      onClick={() => {
                        handleUsernameSelect(emp);
                        handleUsernameSubmit();
                      }}
                    >
                      {emp.full_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <Button
              onClick={handleUsernameSubmit}
              disabled={!username.trim() || isLoading}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 select-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  Loading...
                </span>
              ) : (
                'Next'
              )}
            </Button>
          </div>
        ) : (
          /* PIN Input Section */
          <div className="space-y-6">
            {/* Welcome Message */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground dark:text-foreground mb-2" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
                What's up, {username.split(' ')[0]}!
              </h2>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Still remember that knock-knock combination we agreed on?
              </p>
            </div>

            {/* 4 Separate PIN Input Fields */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((index) => (
                <Input
                  key={index}
                  ref={pinInputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-16 h-16 text-center text-2xl font-semibold border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-border dark:border-border bg-background dark:bg-background text-foreground dark:text-foreground tracking-widest selection:bg-primary/20 selection:text-foreground"
                  value={pin[index]}
                  onChange={(e) => handlePinDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  maxLength={1}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800 text-center">
                {error}
              </div>
            )}

            {/* Login button (hidden but can be triggered) */}
            <Button
              onClick={handlePinSubmit}
              disabled={pin.join('').length !== 4 || isLoading}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 select-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  Verifying...
                </span>
              ) : (
                'Login'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

