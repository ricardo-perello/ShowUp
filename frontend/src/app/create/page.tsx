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
  const { createEvent, createFundedMockEvent, loading, error } = useShowUpTransactions();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    stakeAmount: '',
    capacity: '',
    registrationStartTime: new Date(), // Default to now
    registrationEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24 hours from now
    eventStartTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Default to 25 hours from now
    eventEndTime: new Date(Date.now() + 27 * 60 * 60 * 1000), // Default to 27 hours from now (2 hour event)
    mustRequestToJoin: false, // Default to public event
  });

  // Helper function to safely format date for input
  const formatDateForInput = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };

  // Helper function to safely format time for input
  const formatTimeForInput = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return new Date().toTimeString().slice(0, 5);
    }
    return date.toTimeString().slice(0, 5);
  };

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
        registrationStartTime: formData.registrationStartTime,
        registrationEndTime: formData.registrationEndTime,
        eventStartTime: formData.eventStartTime,
        eventEndTime: formData.eventEndTime,
        mustRequestToJoin: formData.mustRequestToJoin,
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

  const handleCreateFundedMockEvent = async () => {
    if (!account) return;

    try {
      // Test parameters for funded mock event
      const stakeAmount = 1; // 1 SUI per participant
      const capacity = 3;
      const participantCount = 2;
      const attendeeCount = 1;
      const participantFundAmount = stakeAmount * participantCount; // 2 SUI total
      const pendingFundAmount = 0; // No pending requests
      const registrationStartTime = new Date(Date.now());

      // Test addresses (using different addresses for participants)
      const participants = [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222'
      ];
      const attendees = [
        '0x1111111111111111111111111111111111111111111111111111111111111111'
      ];
      const pending: string[] = [];

      const result = await createFundedMockEvent({
        name: 'Test Claim Event' + registrationStartTime.toISOString(),
        description: 'Testing claim functionality with funded mock event',
        location: 'Test Location',
        stakeAmount: stakeAmount,
        capacity: capacity,
        registrationStartTime: new Date(Date.now() + 60 * 1000), // 1 minute from now
        registrationEndTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        eventStartTime: new Date(Date.now() + 6 * 60 * 1000), // 6 minutes from now
        eventEndTime: new Date(Date.now() + 7 * 60 * 1000), // 7 minutes from now
        mustRequestToJoin: false,
        participants: participants,
        attendees: attendees,
        pending: pending,
        participantFundAmount: participantFundAmount,
        pendingFundAmount: pendingFundAmount,
      });

      console.log('Funded mock event created:', result);
      const eventResult = result as { eventId: string; transactionId: string; message: string };
      alert(`Funded mock event created successfully! Event ID: ${eventResult.eventId}\n\nTest scenario:\n- ${participantCount} participants, ${attendeeCount} attendees\n- ${stakeAmount} SUI stake each = ${participantFundAmount} SUI total\n- Expected reward per attendee: ${participantFundAmount / attendeeCount} SUI`);
      
      // Redirect to the created event
      router.push(`/events/${eventResult.eventId}`);
    } catch (error) {
      console.error('Error creating funded mock event:', error);
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
              <label htmlFor="eventStartTime" className="block text-sm font-medium text-gray-700 mb-2">
                Event Starts
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={formatDateForInput(formData.eventStartTime)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      const currentTime = formData.eventStartTime;
                      newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                      setFormData({ ...formData, eventStartTime: newDate });
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="time"
                  value={formatTimeForInput(formData.eventStartTime)}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only update if we have a complete time format (HH:MM)
                    if (value.length === 5 && value.includes(':')) {
                      const [hours, minutes] = value.split(':').map(Number);
                      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                        const newDate = new Date(formData.eventStartTime);
                        if (!isNaN(newDate.getTime())) {
                          newDate.setHours(hours, minutes);
                          setFormData({ ...formData, eventStartTime: newDate });
                        }
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                When the actual event begins
              </p>
            </div>

            <div>
              <label htmlFor="eventEndTime" className="block text-sm font-medium text-gray-700 mb-2">
                Event Ends
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={formatDateForInput(formData.eventEndTime)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      const currentTime = formData.eventEndTime;
                      newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                      setFormData({ ...formData, eventEndTime: newDate });
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="time"
                  value={formatTimeForInput(formData.eventEndTime)}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only update if we have a complete time format (HH:MM)
                    if (value.length === 5 && value.includes(':')) {
                      const [hours, minutes] = value.split(':').map(Number);
                      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                        const newDate = new Date(formData.eventEndTime);
                        if (!isNaN(newDate.getTime())) {
                          newDate.setHours(hours, minutes);
                          setFormData({ ...formData, eventEndTime: newDate });
                        }
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                When the event ends (participants can claim after this time)
              </p>
            </div>

            <div>
              <label htmlFor="registrationStartTime" className="block text-sm font-medium text-gray-700 mb-2">
                Registration Opens
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={formatDateForInput(formData.registrationStartTime)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      const currentTime = formData.registrationStartTime;
                      newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                      setFormData({ ...formData, registrationStartTime: newDate });
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="time"
                  value={formatTimeForInput(formData.registrationStartTime)}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only update if we have a complete time format (HH:MM)
                    if (value.length === 5 && value.includes(':')) {
                      const [hours, minutes] = value.split(':').map(Number);
                      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                        const newDate = new Date(formData.registrationStartTime);
                        if (!isNaN(newDate.getTime())) {
                          newDate.setHours(hours, minutes);
                          setFormData({ ...formData, registrationStartTime: newDate });
                        }
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                When participants can start joining or requesting to join
              </p>
            </div>

            <div>
              <label htmlFor="registrationEndTime" className="block text-sm font-medium text-gray-700 mb-2">
                Registration Closes
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={formatDateForInput(formData.registrationEndTime)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      const currentTime = formData.registrationEndTime;
                      newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                      setFormData({ ...formData, registrationEndTime: newDate });
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="time"
                  value={formatTimeForInput(formData.registrationEndTime)}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only update if we have a complete time format (HH:MM)
                    if (value.length === 5 && value.includes(':')) {
                      const [hours, minutes] = value.split(':').map(Number);
                      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                        const newDate = new Date(formData.registrationEndTime);
                        if (!isNaN(newDate.getTime())) {
                          newDate.setHours(hours, minutes);
                          setFormData({ ...formData, registrationEndTime: newDate });
                        }
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                When participants can no longer join or request to join
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="eventType"
                    value="public"
                    checked={!formData.mustRequestToJoin}
                    onChange={() => setFormData({ ...formData, mustRequestToJoin: false })}
                    className="mr-2"
                  />
                  <span className="text-sm">Public Event - Anyone can join directly</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="eventType"
                    value="private"
                    checked={formData.mustRequestToJoin}
                    onChange={() => setFormData({ ...formData, mustRequestToJoin: true })}
                    className="mr-2"
                  />
                  <span className="text-sm">Private Event - Requires organizer approval</span>
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {formData.mustRequestToJoin 
                  ? "Participants must request to join and wait for your approval"
                  : "Participants can join directly without approval"
                }
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Event Details</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Event: {formData.name || 'Untitled Event'}</li>
                <li>• Location: {formData.location || 'TBD'}</li>
                <li>• Stake: {formData.stakeAmount || 'X'} SUI per participant</li>
                <li>• Capacity: {formData.capacity || 'Unlimited'} participants</li>
                <li>• Registration opens: {formData.registrationStartTime.toLocaleString()}</li>
                <li>• Registration closes: {formData.registrationEndTime.toLocaleString()}</li>
                <li>• Event starts: {formData.eventStartTime.toLocaleString()}</li>
                <li>• Event ends: {formData.eventEndTime.toLocaleString()}</li>
                <li>• Type: {formData.mustRequestToJoin ? 'Private (requires approval)' : 'Public (direct join)'}</li>
                <li>• You can scan QR codes to mark attendance</li>
                <li>• Attendees will share no-show penalties equally</li>
              </ul>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <Link href="/">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="button"
                  onClick={handleCreateFundedMockEvent}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? 'Creating...' : 'Create Test Event (Funded)'}
                </Button>
              </div>
              <Button 
                type="submit" 
                disabled={loading || !formData.name || !formData.description || !formData.location || !formData.stakeAmount}
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
