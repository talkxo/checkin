"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lock, Eye, EyeOff, RefreshCw, Download } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string | null;
  slug: string;
  active: boolean;
  pin_hash: string | null;
  pin_change_required: boolean | null;
}

export default function PinManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPin, setEditingPin] = useState<{ employeeId: string; pin: string } | null>(null);
  const [showPins, setShowPins] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        // Fetch PIN status for each employee
        // Note: We can't fetch PIN hashes directly for security, but we can check if they exist
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setError('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async (employeeId: string, pin: string) => {
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/admin/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, pin })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message || 'PIN set successfully');
        setEditingPin(null);
        // Reload employees to update PIN status
        loadEmployees();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to set PIN');
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleResetPin = async (employeeId: string) => {
    if (!confirm('Are you sure you want to reset this PIN? The employee will need to have a new PIN set.')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const response = await fetch(`/api/admin/set-pin?employeeId=${employeeId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message || 'PIN reset successfully');
        loadEmployees();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to reset PIN');
      }
    } catch (error) {
      console.error('Error resetting PIN:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleBulkGenerate = async () => {
    if (!confirm('This will generate random PINs for all employees without PINs. Continue?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const employeesWithoutPins = employees.filter(emp => !emp.pin_hash && emp.active);
      
      if (employeesWithoutPins.length === 0) {
        setSuccess('All active employees already have PINs set');
        setTimeout(() => setSuccess(''), 3000);
        return;
      }

      // Generate random PINs for each employee
      const pinAssignments: { employeeId: string; pin: string }[] = [];
      const generatedPins: { name: string; pin: string }[] = [];

      for (const emp of employeesWithoutPins) {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit PIN
        pinAssignments.push({ employeeId: emp.id, pin: randomPin });
        generatedPins.push({ name: emp.full_name, pin: randomPin });
      }

      // Set PINs for all employees
      let successCount = 0;
      for (const assignment of pinAssignments) {
        try {
          const response = await fetch('/api/admin/set-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assignment)
          });
          if (response.ok) {
            successCount++;
          }
        } catch (error) {
          console.error(`Error setting PIN for employee ${assignment.employeeId}:`, error);
        }
      }

      if (successCount > 0) {
        setSuccess(`Generated PINs for ${successCount} employees`);
        loadEmployees();
        
        // Export PIN list as CSV
        const csvContent = [
          ['Employee Name', 'PIN'].join(','),
          ...generatedPins.map(p => [`"${p.name}"`, p.pin].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee-pins-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError('Failed to generate PINs');
      }
    } catch (error) {
      console.error('Error in bulk generate:', error);
      setError('Failed to generate PINs');
    }
  };

  const togglePinVisibility = (employeeId: string) => {
    const newSet = new Set(showPins);
    if (newSet.has(employeeId)) {
      newSet.delete(employeeId);
    } else {
      newSet.add(employeeId);
    }
    setShowPins(newSet);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PIN Management</h1>
            <p className="text-gray-600">Set and manage employee PINs for secure login</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBulkGenerate}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate PINs for All
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/admin'}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-green-600">{success}</p>
            </CardContent>
          </Card>
        )}

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Employee PINs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>PIN Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.full_name}</TableCell>
                    <TableCell>{employee.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={employee.active ? 'default' : 'secondary'}>
                        {employee.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {employee.pin_hash ? (
                        <div className="flex gap-2 items-center">
                          <Badge variant="default" className="bg-green-600">
                            Set
                          </Badge>
                          {employee.pin_change_required && (
                            <Badge variant="outline" className="border-orange-500 text-orange-600">
                              Change Required
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">Not Set</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {editingPin?.employeeId === employee.id ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              type="password"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0000"
                              value={editingPin.pin}
                              onChange={(e) => {
                                const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setEditingPin({ ...editingPin, pin: digitsOnly });
                              }}
                              className="w-20"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSetPin(employee.id, editingPin.pin)}
                              disabled={editingPin.pin.length !== 4}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPin(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPin({ employeeId: employee.id, pin: '' })}
                              disabled={!employee.active}
                            >
                              {employee.pin_hash ? 'Change PIN' : 'Set PIN'}
                            </Button>
                            {employee.pin_hash && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleResetPin(employee.id)}
                                disabled={!employee.active}
                              >
                                Reset
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-700">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>PINs must be exactly 4 digits (0000-9999)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>PINs are hashed using bcrypt and cannot be recovered. If an employee forgets their PIN, you must reset it.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>Use "Generate PINs for All" to automatically create random PINs for all employees without PINs. The PIN list will be downloaded as a CSV file.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>Only active employees can have PINs set or changed.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

