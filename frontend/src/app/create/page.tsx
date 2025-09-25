'use client';

import { useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateEvent() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    stakeAmount: '',
    endTime: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setIsLoading(true);
    try {
      // TODO: Implement create_event transaction
      console.log('Creating event with:', formData);
      
      // For now, just simulate success
      setTimeout(() => {
        router.push('/events');
      }, 2000);
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to create events</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="stakeAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Stake Amount (SUI)
              </label>
              <input
                type="number"
                id="stakeAmount"
                value={formData.stakeAmount}
                onChange={(e) => setFormData({ ...formData, stakeAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter stake amount in SUI"
                required
                min="0.001"
                step="0.001"
              />
              <p className="mt-1 text-sm text-gray-500">
                Amount participants need to stake to join this event
              </p>
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                End Time (Epoch)
              </label>
              <input
                type="number"
                id="endTime"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter epoch number"
                required
                min="0"
              />
              <p className="mt-1 text-sm text-gray-500">
                Epoch when the event ends (participants can claim after this)
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Event Details</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Participants will stake {formData.stakeAmount || 'X'} SUI to join</li>
                <li>• Event ends at epoch {formData.endTime || 'X'}</li>
                <li>• You can scan QR codes to mark attendance</li>
                <li>• Attendees will share no-show penalties equally</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.stakeAmount || !formData.endTime}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
