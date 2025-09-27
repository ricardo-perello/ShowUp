'use client';

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { Calendar, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';

export default function CreateEvent() {
  const account = useCurrentAccount();
  const router = useRouter();
  const { createEvent, loading, error } = useShowUpTransactions();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    stakeAmount: '',
    capacity: '',
    durationHours: '2', // Default 2 hours
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    try {
      const result = await createEvent({
        name: formData.name,
        description: formData.description,
        location: formData.location,
        stakeAmount: parseFloat(formData.stakeAmount),
        capacity: parseInt(formData.capacity) || 0, // 0 means unlimited
        durationHours: parseFloat(formData.durationHours),
      });

      // Event created successfully!
      console.log('Event created:', result);
      const eventResult = result as { eventId: string; transactionId: string; message: string };
      alert(`Event created successfully! Event ID: ${eventResult.eventId}`);
      
      // Redirect to the created event
      router.push(`/events/${eventResult.eventId}`);
    } catch (error) {
      console.error('Error creating event:', error);
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
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Event Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event name"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event description"
                rows={3}
                required
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event location"
                required
              />
            </div>

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
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                Capacity
              </label>
              <input
                type="number"
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter capacity (0 for unlimited)"
                min="0"
              />
              <p className="mt-1 text-sm text-gray-500">
                Maximum number of participants (0 for unlimited)
              </p>
            </div>

            <div>
              <label htmlFor="durationHours" className="block text-sm font-medium text-gray-700 mb-2">
                Event Duration (Hours)
              </label>
              <input
                type="number"
                id="durationHours"
                value={formData.durationHours}
                onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter duration in hours"
                required
                min="0.1"
                step="0.1"
              />
              <p className="mt-1 text-sm text-gray-500">
                How long the event will last (participants can claim after this duration)
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Event Details</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Event: {formData.name || 'Untitled Event'}</li>
                <li>• Location: {formData.location || 'TBD'}</li>
                <li>• Stake: {formData.stakeAmount || 'X'} SUI per participant</li>
                <li>• Capacity: {formData.capacity || 'Unlimited'} participants</li>
                <li>• Duration: {formData.durationHours || 'X'} hours</li>
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
                disabled={loading || !formData.name || !formData.description || !formData.location || !formData.stakeAmount || !formData.durationHours}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
