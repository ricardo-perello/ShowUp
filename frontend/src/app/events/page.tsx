'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { Calendar, ArrowLeft, Users, Clock, Coins, UserPlus, Eye, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Event, EventObject } from '@/lib/sui';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';

export default function EventsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { getAllEventsGlobal, refreshGlobalEvents, joinEvent, loading: transactionLoading, error } = useShowUpTransactions();
  const [events, setEvents] = useState<EventObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    setIsLoading(true);
    
    try {
      const fetchedEvents = await getAllEventsGlobal();
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      // Fallback to empty array on error
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [getAllEventsGlobal]);

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

  const isParticipant = (event: EventObject) => {
    return Array.isArray(event.participants) && event.participants.includes(account?.address || '');
  };

  const isOrganizer = (event: EventObject) => {
    return event.organizer === account?.address;
  };

  const canJoinEvent = (event: EventObject) => {
    const status = getEventStatus(event);
    const isParticipantAlready = isParticipant(event);
    const isOrganizerOfEvent = isOrganizer(event);
    const participantCount = Array.isArray(event.participants) ? event.participants.length : 0;
    const isFull = participantCount >= parseInt(event.capacity);
    
    // TEMPORARY FIX: Since participants array is empty due to table parsing issues,
    // we'll allow joining if the user is not the organizer and the event is not ended
    // TODO: Fix table parsing to get actual participant data
    const canJoin = (status === 'upcoming' || status === 'ongoing') && !isOrganizerOfEvent;
    
    return canJoin;
  };

  const handleJoinEvent = async (event: EventObject) => {
    if (!account) return;
    
    try {
      console.log('🪙 Joining event:', event.name);
      
      // joinEvent will handle all coin selection automatically
      await joinEvent(event.id);
      
      // Refresh events after joining
      await fetchEvents();
    } catch (error) {
      console.error('Error joining event:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to join event: ${errorMessage}`);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to view events</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Browse Events</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={async () => {
                  refreshGlobalEvents();
                  await fetchEvents();
                }}
                variant="outline"
                disabled={isLoading || transactionLoading}
              >
                {isLoading || transactionLoading ? 'Loading...' : 'Refresh'}
              </Button>
              <Link href="/my-participations">
                <Button variant="outline">My Participations</Button>
              </Link>
              <Link href="/create">
                <Button>Create Event</Button>
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Events List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h2>
            <p className="text-gray-600 mb-6">Be the first to create an event!</p>
            <Link href="/create">
              <Button>Create Event</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {events.length} Event{events.length !== 1 ? 's' : ''} Available
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const status = getEventStatus(event);
                const isParticipantAlready = isParticipant(event);
                const isOrganizerOfEvent = isOrganizer(event);
                const participantCount = Array.isArray(event.participants) ? event.participants.length : 0;
                const isFull = participantCount >= parseInt(event.capacity);
                const canJoin = canJoinEvent(event);


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
                          {participantCount}/{event.capacity} participants
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

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Link href={`/events/${event.id}`} className="block">
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      
                      {canJoin ? (
                        <Button 
                          onClick={() => handleJoinEvent(event)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={transactionLoading}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {transactionLoading ? 'Joining...' : 'Join Event'}
                        </Button>
                      ) : isOrganizerOfEvent ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Users className="h-4 w-4 mr-2" />
                          Your Event
                        </Button>
                      ) : status === 'ended' ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Clock className="h-4 w-4 mr-2" />
                          Event Ended
                        </Button>
                      ) : null}
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
