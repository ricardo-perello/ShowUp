'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { Calendar, ArrowLeft, Users, Clock, Coins, QrCode, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { EventObject } from '@/lib/sui';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';

export default function MyParticipationsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { getAllEventsGlobal, joinEvent, loading: transactionLoading, error } = useShowUpTransactions();
  const [events, setEvents] = useState<EventObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyParticipations = async () => {
    if (!account) return;
    
    setIsLoading(true);
    
    try {
      const allEvents = await getAllEventsGlobal();
      // Filter events where user is a participant
      const myParticipations = allEvents.filter(event => 
        Array.isArray(event.participants) && event.participants.includes(account.address)
      );
      setEvents(myParticipations);
    } catch (error) {
      console.error('Error fetching my participations:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyParticipations();
  }, [account, getAllEventsGlobal]);

  const formatSUI = (mist: string) => {
    return (parseInt(mist) / 1_000_000_000).toFixed(3);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  const getEventStatus = (event: EventObject) => {
    const now = Math.floor(Date.now() / 1000);
    const startTime = parseInt(event.startTime);
    const endTime = parseInt(event.endTime);
    
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now < endTime) return 'ongoing';
    if (now >= endTime) return 'ended';
    return 'unknown';
  };

  const isAttendee = (event: EventObject) => {
    return Array.isArray(event.attendees) && event.attendees.includes(account?.address || '');
  };

  const hasClaimed = (event: EventObject) => {
    return Array.isArray(event.claimed) && event.claimed.includes(account?.address || '');
  };

  const generateQRData = (event: EventObject) => {
    return JSON.stringify({
      event_id: event.id,
      address: account?.address,
      timestamp: Date.now(),
    });
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to view your participations</p>
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
              <Calendar className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">My Participations</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/events">
                <Button variant="outline">Browse Events</Button>
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Participations List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your participations...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Participations Yet</h2>
            <p className="text-gray-600 mb-6">You haven't joined any events yet. Browse events to get started!</p>
            <Link href="/events">
              <Button>Browse Events</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {events.length} Event{events.length !== 1 ? 's' : ''} Joined
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const status = getEventStatus(event);
                const isAttended = isAttendee(event);
                const hasClaimedReward = hasClaimed(event);
                const qrData = generateQRData(event);

                return (
                  <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTimestamp(event.startTime)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Users className="h-4 w-4 mr-1" />
                          {event.capacity} max participants
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Coins className="h-4 w-4 mr-1" />
                          {formatSUI(event.stakeAmount)} SUI stake
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                        status === 'ongoing' ? 'bg-green-100 text-green-800' :
                        status === 'ended' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {status === 'upcoming' ? 'Upcoming' :
                         status === 'ongoing' ? 'Ongoing' :
                         status === 'ended' ? 'Ended' : 'Unknown'}
                      </span>
                    </div>

                    {/* QR Code Section */}
                    {status === 'upcoming' || status === 'ongoing' ? (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">Your QR Code</h4>
                          <QrCode className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="text-xs text-gray-600 break-all">
                          {qrData}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Show this to the organizer for check-in
                        </p>
                      </div>
                    ) : null}

                    {/* Attendance Status */}
                    {status === 'ended' && (
                      <div className="mb-4">
                        {isAttended ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Attended</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Not Attended</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Link href={`/events/${event.id}`} className="block">
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      
                      {status === 'ended' && isAttended && !hasClaimedReward && (
                        <Button className="w-full bg-green-600 hover:bg-green-700">
                          Claim Rewards
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
