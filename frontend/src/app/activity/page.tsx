'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { ArrowLeft, Activity, Users, UserPlus, CheckCircle, Coins } from 'lucide-react';
import Link from 'next/link';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';

interface NetworkEvent {
  id: string;
  timestamp: string;
  type: string;
  parsedJson: {
    event_id?: string;
    organizer?: string;
    participant?: string;
    name?: string;
    stake_amount?: string;
    capacity?: string;
    must_request_to_join?: boolean;
    amount?: string;
  };
}

export default function ActivityPage() {
  const account = useCurrentAccount();
  const { queryNetworkEvents } = useShowUpTransactions();
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState<string>('all');

  const eventTypes = [
    { value: 'all', label: 'All Events', icon: Activity },
    { value: 'EventCreated', label: 'Events Created', icon: Users },
    { value: 'EventJoined', label: 'Joined Events', icon: UserPlus },
    { value: 'EventRequested', label: 'Requests Made', icon: UserPlus },
    { value: 'EventAttended', label: 'Attendance Marked', icon: CheckCircle },
    { value: 'EventClaimed', label: 'Rewards Claimed', icon: Coins },
  ];

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const eventType = selectedEventType === 'all' ? undefined : selectedEventType;
      const networkEvents = await queryNetworkEvents(eventType, 50);
      console.log('🔍 Raw network events:', networkEvents);
      console.log('🔍 First event structure:', networkEvents[0]);
      setEvents(networkEvents as NetworkEvent[]);
    } catch (error) {
      console.error('Error fetching network events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedEventType]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatSUI = (mist: string) => {
    return (parseInt(mist) / 1_000_000_000).toFixed(3);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'EventCreated':
        return <Users className="h-4 w-4" />;
      case 'EventJoined':
        return <UserPlus className="h-4 w-4" />;
      case 'EventRequested':
        return <UserPlus className="h-4 w-4" />;
      case 'EventAttended':
        return <CheckCircle className="h-4 w-4" />;
      case 'EventClaimed':
        return <Coins className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getEventDescription = (event: NetworkEvent) => {
    const { type, parsedJson } = event;
    
    switch (type) {
      case 'EventCreated':
        return `Created event "${parsedJson.name}" with ${formatSUI(parsedJson.stake_amount || '0')} SUI stake`;
      case 'EventJoined':
        return `Joined event with ${formatSUI(parsedJson.stake_amount || '0')} SUI stake`;
      case 'EventRequested':
        return `Requested to join event with ${formatSUI(parsedJson.stake_amount || '0')} SUI stake`;
      case 'EventAttended':
        return `Marked as attended`;
      case 'EventClaimed':
        return `Claimed ${formatSUI(parsedJson.amount || '0')} SUI reward`;
      default:
        return `Event: ${type}`;
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Activity Feed</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view activity</p>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/events">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
              <p className="text-gray-600">Recent activity on the ShowUp platform</p>
            </div>
          </div>
        </div>

        {/* Event Type Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((eventType) => {
              const Icon = eventType.icon;
              return (
                <Button
                  key={eventType.value}
                  variant={selectedEventType === eventType.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedEventType(eventType.value)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{eventType.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading activity...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No activity found</p>
            </div>
          ) : (
            events.map((event, index) => {
              console.log('🔍 Event in activity page:', { id: event.id, type: typeof event.id, index });
              // Ensure we always have a unique string key
              const eventKey = typeof event.id === 'string' && event.id ? event.id : `event-${index}-${event.timestamp || Date.now()}`;
              return (
              <div key={eventKey} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {getEventIcon(event.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {getEventDescription(event)}
                      </h3>
                      <time className="text-xs text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </time>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Event ID: {formatAddress(event.parsedJson.event_id || '')}
                      {event.parsedJson.participant && (
                        <span> • Participant: {formatAddress(event.parsedJson.participant)}</span>
                      )}
                      {event.parsedJson.organizer && (
                        <span> • Organizer: {formatAddress(event.parsedJson.organizer)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <Button onClick={fetchEvents} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh Activity'}
          </Button>
        </div>
      </div>
    </div>
  );
}
