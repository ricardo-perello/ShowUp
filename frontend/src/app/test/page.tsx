'use client';

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';
import { ArrowLeft, Calendar, Users, Coins } from 'lucide-react';
import Link from 'next/link';

export default function TestPage() {
  const account = useCurrentAccount();
  const { createEvent, joinEvent, markAttendance, claim, refund, loading, error } = useShowUpTransactions();
  
  const [testResults, setTestResults] = useState<string[]>([]);
  const [eventId, setEventId] = useState<string>('');

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCreateEvent = async () => {
    try {
      addResult('Creating test event...');
      const result = await createEvent({
        name: 'Test Event',
        description: 'A test event for ShowUp',
        location: 'Test Location',
        stakeAmount: 0.1, // 0.1 SUI
        capacity: 10,
        durationHours: 1,
      });
      
      const eventResult = result as { eventId: string; transactionId: string; message: string };
      setEventId(eventResult.eventId);
      addResult(`✅ Event created! ID: ${eventResult.eventId}`);
      addResult(`Message: ${eventResult.message}`);
    } catch (err) {
      addResult(`❌ Error creating event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testJoinEvent = async () => {
    if (!eventId) {
      addResult('❌ No event ID available. Create an event first.');
      return;
    }

    try {
      addResult('Joining event...');
      const result = await joinEvent(eventId, 'test-coin-id');
      addResult(`✅ Joined event! Transaction: ${result.transactionId}`);
      addResult(`Message: ${result.message}`);
    } catch (err) {
      addResult(`❌ Error joining event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testMarkAttendance = async () => {
    if (!eventId) {
      addResult('❌ No event ID available. Create an event first.');
      return;
    }

    try {
      addResult('Marking attendance...');
      const result = await markAttendance(eventId, account?.address || 'test-address');
      addResult(`✅ Attendance marked! Transaction: ${result.transactionId}`);
      addResult(`Message: ${result.message}`);
    } catch (err) {
      addResult(`❌ Error marking attendance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testClaim = async () => {
    if (!eventId) {
      addResult('❌ No event ID available. Create an event first.');
      return;
    }

    try {
      addResult('Claiming rewards...');
      const result = await claim(eventId);
      addResult(`✅ Claimed rewards! Transaction: ${result.transactionId}`);
      addResult(`Message: ${result.message}`);
    } catch (err) {
      addResult(`❌ Error claiming: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testRefund = async () => {
    if (!eventId) {
      addResult('❌ No event ID available. Create an event first.');
      return;
    }

    try {
      addResult('Requesting refund...');
      const result = await refund(eventId);
      addResult(`✅ Refund processed! Transaction: ${result.transactionId}`);
      addResult(`Message: ${result.message}`);
    } catch (err) {
      addResult(`❌ Error refunding: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to test the ShowUp integration</p>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
              </Link>
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">ShowUp Integration Test</h1>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Test Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">1. Create Event</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Create a test event with 0.1 SUI stake, 10 capacity, 1 hour duration
                </p>
                <Button 
                  onClick={testCreateEvent} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Creating...' : 'Create Test Event'}
                </Button>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-medium text-green-900 mb-2">2. Join Event</h3>
                <p className="text-sm text-green-800 mb-3">
                  Join the created event (requires SUI coins)
                </p>
                <Button 
                  onClick={testJoinEvent} 
                  disabled={loading || !eventId}
                  className="w-full"
                >
                  {loading ? 'Joining...' : 'Join Event'}
                </Button>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">3. Mark Attendance</h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Mark attendance for the current user
                </p>
                <Button 
                  onClick={testMarkAttendance} 
                  disabled={loading || !eventId}
                  className="w-full"
                >
                  {loading ? 'Marking...' : 'Mark Attendance'}
                </Button>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="text-sm font-medium text-purple-900 mb-2">4. Claim Rewards</h3>
                <p className="text-sm text-purple-800 mb-3">
                  Claim rewards after event ends
                </p>
                <Button 
                  onClick={testClaim} 
                  disabled={loading || !eventId}
                  className="w-full"
                >
                  {loading ? 'Claiming...' : 'Claim Rewards'}
                </Button>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-medium text-red-900 mb-2">5. Refund</h3>
                <p className="text-sm text-red-800 mb-3">
                  Get refund if event is cancelled
                </p>
                <Button 
                  onClick={testRefund} 
                  disabled={loading || !eventId}
                  className="w-full"
                >
                  {loading ? 'Refunding...' : 'Get Refund'}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={clearResults} 
                  variant="outline"
                  className="w-full"
                >
                  Clear Results
                </Button>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                Error: {error}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No test results yet. Click a test button to start.</p>
              ) : (
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono text-gray-800">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {eventId && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Current Event ID:</strong> {eventId}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>1. <strong>Connect your wallet</strong> - Make sure you have SUI tokens for testing</p>
            <p>2. <strong>Create Event</strong> - This will create a test event on the blockchain</p>
            <p>3. <strong>Join Event</strong> - This will stake SUI to join the event</p>
            <p>4. <strong>Mark Attendance</strong> - This will mark you as attended (organizer action)</p>
            <p>5. <strong>Claim/Refund</strong> - This will claim rewards or get refunds</p>
            <p className="text-blue-600 font-medium">
              Note: All transactions will be submitted to your wallet for approval. 
              Check your wallet for transaction confirmations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
