"use client";

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PinChangeModalProps {
  employeeId: string;
  employeeName: string;
  onPinChanged: () => void;
  onCancel?: () => void;
}

export default function PinChangeModal({ 
  employeeId, 
  employeeName, 
  onPinChanged,
  onCancel 
}: PinChangeModalProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const currentPinRef = useRef<HTMLInputElement>(null);
  const newPinRef = useRef<HTMLInputElement>(null);
  const confirmPinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus current PIN input
    currentPinRef.current?.focus();
  }, []);

  const handleCurrentPinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setCurrentPin(digitsOnly);
    setError('');
    
    if (digitsOnly.length === 4) {
      newPinRef.current?.focus();
    }
  };

  const handleNewPinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setNewPin(digitsOnly);
    setError('');
    
    if (digitsOnly.length === 4) {
      confirmPinRef.current?.focus();
    }
  };

  const handleConfirmPinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setConfirmPin(digitsOnly);
    setError('');
    
    if (digitsOnly.length === 4 && newPin.length === 4 && digitsOnly === newPin) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (currentPin.length !== 4) {
      setError('Please enter your current PIN');
      currentPinRef.current?.focus();
      return;
    }

    if (newPin.length !== 4) {
      setError('Please enter a new 4-digit PIN');
      newPinRef.current?.focus();
      return;
    }

    if (newPin === currentPin) {
      setError('New PIN must be different from current PIN');
      newPinRef.current?.focus();
      return;
    }

    if (confirmPin.length !== 4) {
      setError('Please confirm your new PIN');
      confirmPinRef.current?.focus();
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match');
      setConfirmPin('');
      confirmPinRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          currentPin,
          newPin
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - call callback
        onPinChanged();
      } else {
        setError(data.error || 'Failed to change PIN');
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        currentPinRef.current?.focus();
      }
    } catch (error) {
      console.error('Change PIN error:', error);
      setError('Network error. Please try again.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      currentPinRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Change Your PIN</h2>
        <p className="text-sm text-gray-600 mb-6">
          Hi {employeeName}! For security, please change your PIN to a new 4-digit code.
        </p>

        <div className="space-y-4">
          {/* Current PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current PIN
            </label>
            <Input
              ref={currentPinRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-4 py-3 text-center text-lg border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-purple-500 border-gray-300 tracking-widest font-mono"
              placeholder="••••"
              value={currentPin}
              onChange={(e) => handleCurrentPinChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && currentPin.length === 4) {
                  newPinRef.current?.focus();
                }
              }}
              maxLength={4}
            />
          </div>

          {/* New PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New PIN
            </label>
            <Input
              ref={newPinRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-4 py-3 text-center text-lg border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-purple-500 border-gray-300 tracking-widest font-mono"
              placeholder="••••"
              value={newPin}
              onChange={(e) => handleNewPinChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newPin.length === 4) {
                  confirmPinRef.current?.focus();
                }
              }}
              maxLength={4}
            />
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New PIN
            </label>
            <Input
              ref={confirmPinRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-4 py-3 text-center text-lg border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-purple-500 border-gray-300 tracking-widest font-mono"
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => handleConfirmPinChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && confirmPin.length === 4 && newPin.length === 4) {
                  handleSubmit();
                }
              }}
              maxLength={4}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-center">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4 || isLoading}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Changing PIN...
              </span>
            ) : (
              'Change PIN'
            )}
          </Button>

          {/* Note */}
          <p className="text-xs text-gray-500 text-center">
            ⚠️ You cannot proceed until you change your PIN
          </p>
        </div>
      </div>
    </div>
  );
}


