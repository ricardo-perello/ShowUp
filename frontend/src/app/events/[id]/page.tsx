'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { Calendar, ArrowLeft, Users, Clock, Coins, QrCode, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Event, QRPayload } from '@/lib/sui';
import { QRCodeCanvas } from 'qrcode.react';

export default function EventDetailsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!account) {
        setIsLoading(false);
        return;
      }

      try {
        // TODO: Implement actual event fetching from blockchain
        // For now, show mock data
        const mockEvent: Event = {
          id: eventId,
          organizer: '0x123...abc',
          stakeAmount: '1000000000', // 1 SUI in MIST
          endTime: '100',
          participants: ['0x456...def', '0x789...ghi'],
          attendees: ['0x456...def'],
          vault: '2000000000'
        };
        
        setEvent(mockEvent);
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [account, eventId]);

  const formatSUI = (mist: string) => {
    return (parseInt(mist) / 1_000_000_000).toFixed(3);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isOrganizer = account && event && account.address === event.organizer;
  const isParticipant = account && event && event.participants.includes(account.address);
  const hasAttended = account && event && event.attendees.includes(account.address);
  const canClaim = hasAttended && parseInt(event?.endTime || '0') < 100; // Mock current epoch

  const handleJoinEvent = async () => {
    if (!account || !event) return;

    setIsJoining(true);
    try {
      // TODO: Implement join_event transaction
      console.log('Joining event:', eventId);
      
      // Generate QR code for participant
      const qrPayload: QRPayload = {
        event_id: eventId,
        address: account.address
      };
      setQrCode(JSON.stringify(qrPayload));
    } catch (error) {
      console.error('Error joining event:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleClaim = async () => {
    if (!account || !event) return;

    setIsClaiming(true);
    try {
      // TODO: Implement claim transaction
      console.log('Claiming rewards for event:', eventId);
    } catch (error) {
      console.error('Error claiming rewards:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to view event details</p>
          <WalletButton />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist</p>
          <Link href="/events">
            <Button>Back to Events</Button>
          </Link>
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
              <Link href="/events" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
              </Link>
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Event {formatAddress(event.id)}
              </h1>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Event Details */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Event Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Information</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Organizer:</span>
                <span className="font-medium">{formatAddress(event.organizer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stake Amount:</span>
                <span className="font-medium text-blue-600">{formatSUI(event.stakeAmount)} SUI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">End Time:</span>
                <span className="font-medium">Epoch {event.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Participants:</span>
                <span className="font-medium">{event.participants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Attendees:</span>
                <span className="font-medium text-green-600">{event.attendees.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vault Balance:</span>
                <span className="font-medium text-purple-600">{formatSUI(event.vault)} SUI</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
            
            {isOrganizer ? (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">You are the organizer of this event</p>
                <Link href={`/checkin/${eventId}`}>
                  <Button className="w-full">
                    <QrCode className="h-5 w-5 mr-2" />
                    Scan QR Codes
                  </Button>
                </Link>
                <div className="text-sm text-gray-600">
                  <p>• Use the scanner to mark participant attendance</p>
                  <p>• Participants will show you their QR codes</p>
                </div>
              </div>
            ) : isParticipant ? (
              <div className="space-y-4">
                {hasAttended ? (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-green-600 font-medium mb-4">You attended this event!</p>
                    {canClaim ? (
                      <Button 
                        onClick={handleClaim} 
                        disabled={isClaiming}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                      </Button>
                    ) : (
                      <p className="text-gray-600 text-sm">Event hasn't ended yet</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">You joined this event</p>
                    {qrCode ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Show this QR code to the organizer:</p>
                        <div className="flex justify-center">
                          <QRCodeCanvas value={qrCode} size={200} />
                        </div>
                        <p className="text-xs text-gray-500">Event ID: {eventId}</p>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleJoinEvent} 
                        disabled={isJoining}
                        className="w-full"
                      >
                        {isJoining ? 'Joining...' : 'Generate QR Code'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">Join this event by staking tokens</p>
                <Button 
                  onClick={handleJoinEvent} 
                  disabled={isJoining}
                  className="w-full"
                >
                  {isJoining ? 'Joining...' : `Join Event (${formatSUI(event.stakeAmount)} SUI)`}
                </Button>
                <div className="text-sm text-gray-600">
                  <p>• You'll need to stake {formatSUI(event.stakeAmount)} SUI</p>
                  <p>• Get a QR code to show the organizer</p>
                  <p>• Claim rewards after attending</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Participants List */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants</h2>
          <div className="space-y-2">
            {event.participants.map((participant, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <span className="font-mono text-sm">{formatAddress(participant)}</span>
                {event.attendees.includes(participant) ? (
                  <span className="text-green-600 text-sm font-medium">Attended</span>
                ) : (
                  <span className="text-gray-500 text-sm">Not attended</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
