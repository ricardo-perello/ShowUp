'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { Calendar, ArrowLeft, Users, Clock, Coins } from 'lucide-react';
import Link from 'next/link';
import { Event } from '@/lib/sui';

export default function EventsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!account) {
        setIsLoading(false);
        return;
      }

      try {
        // TODO: Implement actual event fetching from blockchain
        // For now, show mock data
        const mockEvents: Event[] = [
          {
            id: '0x1',
            organizer: '0x123...abc',
            stakeAmount: '1000000000', // 1 SUI in MIST
            endTime: '100',
            participants: ['0x456...def', '0x789...ghi'],
            attendees: [],
            vault: '2000000000'
          },
          {
            id: '0x2',
            organizer: '0x999...xyz',
            stakeAmount: '5000000000', // 5 SUI in MIST
            endTime: '150',
            participants: ['0x111...aaa', '0x222...bbb', '0x333...ccc'],
            attendees: ['0x111...aaa', '0x222...bbb'],
            vault: '15000000000'
          }
        ];
        
        setEvents(mockEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [account]);

  const formatSUI = (mist: string) => {
    return (parseInt(mist) / 1_000_000_000).toFixed(3);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
              <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            </div>
            <div className="flex items-center space-x-4">
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
          <div className="grid gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Event {formatAddress(event.id)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Organizer: {formatAddress(event.organizer)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatSUI(event.stakeAmount)} SUI
                    </div>
                    <p className="text-sm text-gray-600">Stake Amount</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Users className="h-5 w-5 mr-2" />
                    <span className="text-sm">
                      {event.participants.length} participants
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-5 w-5 mr-2" />
                    <span className="text-sm">
                      Ends at epoch {event.endTime}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Coins className="h-5 w-5 mr-2" />
                    <span className="text-sm">
                      {formatSUI(event.vault)} SUI in vault
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {event.attendees.length} attended
                  </div>
                  <Link href={`/events/${event.id}`}>
                    <Button variant="outline">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
