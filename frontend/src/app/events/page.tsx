'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { Calendar, ArrowLeft, Users, Clock, Coins, UserPlus, Eye } from 'lucide-react';
import Link from 'next/link';
import { EventObject, isUserParticipant } from '@/lib/sui';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';

export default function EventsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { getAllEventsGlobal, refreshGlobalEvents, joinEvent, requestToJoin, loading: transactionLoading } = useShowUpTransactions();
  const [events, setEvents] = useState<EventObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [participantStatus, setParticipantStatus] = useState<Record<string, boolean>>({});

  const checkParticipantStatus = useCallback(async (eventId: string) => {
    if (!account?.address || !suiClient) return false;
    
    try {
      const isParticipant = await isUserParticipant(suiClient, eventId, account.address);
      setParticipantStatus(prev => ({ ...prev, [eventId]: isParticipant }));
      return isParticipant;
    } catch (error) {
      console.error('Error checking participant status:', error);
      return false;
    }
  }, [account?.address, suiClient]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const fetchedEvents = await getAllEventsGlobal();
      setEvents(fetchedEvents);
      
      // Check participant status for each event
      if (account?.address && suiClient) {
        for (const event of fetchedEvents) {
          checkParticipantStatus(event.id);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      // Fallback to empty array on error
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [getAllEventsGlobal, account?.address, suiClient, checkParticipantStatus]);

  useEffect(() => {
    fetchEvents();
  }, [getAllEventsGlobal, fetchEvents]);

  const formatSUI = (mist: string) => {
    return (parseInt(mist) / 1_000_000_000).toFixed(3);
  };


  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  const getEventStatus = (event: EventObject) => {
    const now = Math.floor(Date.now() / 1000);
    const startTime = parseInt(event.startTime);
    const registrationEndTime = parseInt(event.registrationEndTime);
    const endTime = parseInt(event.endTime);
    
    if (now < registrationEndTime) return 'upcoming';
    if (now >= registrationEndTime && now < startTime) return 'registration_closed';
    if (now >= startTime && now < endTime) return 'ongoing';
    if (now >= endTime) return 'ended';
    return 'unknown';
  };

  const isParticipant = (event: EventObject) => {
    return participantStatus[event.id] || false;
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
    
    // Can only join if:
    // 1. Not already a participant
    // 2. Not the organizer
    // 3. Registration is still open (upcoming status)
    // 4. Not at capacity
    const canJoin = !isParticipantAlready && 
                   !isOrganizerOfEvent && 
                   status === 'upcoming' && 
                   !isFull;
    
    return canJoin;
  };

  const canRequestToJoin = (event: EventObject) => {
    const status = getEventStatus(event);
    const isParticipantAlready = isParticipant(event);
    const isOrganizerOfEvent = isOrganizer(event);
    const participantCount = Array.isArray(event.participants) ? event.participants.length : 0;
    const isFull = participantCount >= parseInt(event.capacity);
    
    // Can request to join if:
    // 1. Event is private (mustRequestToJoin = true)
    // 2. Not already a participant
    // 3. Not the organizer
    // 4. Registration is still open (upcoming status)
    // 5. Not at capacity
    const canRequest = event.mustRequestToJoin && 
                      !isParticipantAlready && 
                      !isOrganizerOfEvent && 
                      status === 'upcoming' && 
                      !isFull;
    
    return canRequest;
  };

  const handleJoinEvent = async (event: EventObject) => {
    if (!account) return;
    
    try {
      console.log('🪙 Joining event:', event.name);
      
      // joinEvent will handle all coin selection automatically
      await joinEvent(event.id);
      
      // Check participant status for this specific event
      await checkParticipantStatus(event.id);
      
      // Refresh events after joining
      await fetchEvents();
    } catch (error) {
      console.error('Error joining event:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to join event: ${errorMessage}`);
    }
  };

  const handleRequestToJoin = async (event: EventObject) => {
    if (!account) return;
    
    try {
      console.log('📝 Requesting to join event:', event.name);
      
      // requestToJoin will handle all coin selection automatically
      await requestToJoin(event.id);
      
      // Refresh events after requesting
      await fetchEvents();
    } catch (error) {
      console.error('Error requesting to join event:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to request to join event: ${errorMessage}`);
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
                const isOrganizerOfEvent = isOrganizer(event);
                const participantCount = Array.isArray(event.participants) ? event.participants.length : 0;
                const canJoin = canJoinEvent(event);
                const canRequest = canRequestToJoin(event);


                return (
                  <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Clock className="h-4 w-4 mr-1" />
                          Starts: {formatTimestamp(event.startTime)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Clock className="h-4 w-4 mr-1" />
                          Registration closes: {formatTimestamp(event.registrationEndTime)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Users className="h-4 w-4 mr-1" />
                          {participantCount}/{event.capacity} participants
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Coins className="h-4 w-4 mr-1" />
                          {formatSUI(event.stakeAmount)} SUI stake
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            event.mustRequestToJoin ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {event.mustRequestToJoin ? 'Private Event' : 'Public Event'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                        status === 'registration_closed' ? 'bg-orange-100 text-orange-800' :
                        status === 'ongoing' ? 'bg-green-100 text-green-800' :
                        status === 'ended' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {status === 'upcoming' ? 'Registration Open' :
                         status === 'registration_closed' ? 'Registration Closed' :
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
                      ) : canRequest ? (
                        <Button 
                          onClick={() => handleRequestToJoin(event)}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          disabled={transactionLoading}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {transactionLoading ? 'Requesting...' : 'Request to Join'}
                        </Button>
                      ) : isOrganizerOfEvent ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Users className="h-4 w-4 mr-2" />
                          Your Event
                        </Button>
                      ) : status === 'registration_closed' ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Clock className="h-4 w-4 mr-2" />
                          Registration Closed
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
