'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Coins, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';
import { QRCodeSVG } from 'qrcode.react';

export default function EventDetailsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const params = useParams();
  const eventId = params.id as string;
  
  const { joinEvent, claim, refund, getUserSUICoins, loading, error } = useShowUpTransactions();
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!account) {
        setIsLoading(false);
        return;
      }

      // Don't try to fetch if eventId is still pending
      if (eventId === 'pending') {
        setIsLoading(false);
        return;
      }

      try {
        const eventData = await suiClient.getObject({
          id: eventId,
          options: {
            showContent: true,
            showDisplay: true,
            showType: true,
          },
        });

        if (eventData.data?.content && 'fields' in eventData.data.content) {
          const eventFields = eventData.data.content.fields as Record<string, unknown>;
          console.log('🔍 Event data from blockchain:', eventFields);
          console.log('📋 Participants type:', typeof eventFields.participants, eventFields.participants);
          console.log('📋 Attendees type:', typeof eventFields.attendees, eventFields.attendees);
          console.log('📋 Claimed type:', typeof eventFields.claimed, eventFields.claimed);
          setEvent(eventFields);
        }
      } catch (err) {
        console.error('Error fetching event:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [account, eventId, suiClient]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: unknown) => {
    return new Date(parseInt(timestamp as string) * 1000).toLocaleString();
  };

  const formatSUI = (mist: unknown) => {
    return (parseInt(mist as string) / 1_000_000_000).toFixed(2);
  };

  const handleJoin = async () => {
    if (!account || !event) return;

    setIsJoining(true);
    try {
      // Get user's SUI coins
      const stakeAmount = parseInt(event.stake_amount as string);
      const coins = await getUserSUICoins(stakeAmount);
      
      if (coins.length === 0) {
        alert('Insufficient SUI balance. Please ensure you have enough SUI to join this event.');
        return;
      }

      // Use the first suitable coin
      const result = await joinEvent(eventId, coins[0]);
      alert(`Successfully joined event! Transaction: ${result.transactionId}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error joining event:', err);
      alert(`Failed to join event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleClaim = async () => {
    if (!account) return;

    setIsClaiming(true);
    try {
      const result = await claim(eventId);
      alert(`Successfully claimed rewards! Transaction: ${result.transactionId}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error claiming:', err);
      alert(`Failed to claim: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRefund = async () => {
    if (!account) return;

    setIsRefunding(true);
    try {
      const result = await refund(eventId);
      alert(`Successfully refunded! Transaction: ${result.transactionId}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error refunding:', err);
      alert(`Failed to refund: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRefunding(false);
    }
  };

  // Generate QR code for participants
  const generateQRCode = () => {
    if (!account) return null;
    
    const qrData = JSON.stringify({
      event_id: eventId,
      address: account.address,
    });

    return qrData;
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

  if (eventId === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Being Created</h1>
          <p className="text-gray-600 mb-6">Your event is being created on the blockchain. Please wait...</p>
          <p className="text-sm text-gray-500">This may take a few moments. You can check your wallet for transaction confirmation.</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600 mb-6">The event you&apos;re looking for doesn&apos;t exist</p>
          <Link href="/events">
            <Button>Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOrganizer = account.address === (event.organizer as string);
  const isParticipant = Array.isArray(event.participants) ? event.participants.includes(account.address) : false;
  const isAttendee = Array.isArray(event.attendees) ? event.attendees.includes(account.address) : false;
  const hasClaimed = Array.isArray(event.claimed) ? event.claimed.includes(account.address) : false;
  const isCancelled = (event.end_time as string) === '0';
  const currentTime = Math.floor(Date.now() / 1000);
  const eventEnded = currentTime >= parseInt(event.end_time as string);
  const eventStarted = currentTime >= parseInt(event.start_time as string);

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
              <h1 className="text-2xl font-bold text-gray-900">{event.name as string}</h1>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Event Details */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-gray-900">{event.location as string}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Time</p>
                  <p className="text-gray-900">{formatTime(event.start_time)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">End Time</p>
                  <p className="text-gray-900">{formatTime(event.end_time)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Coins className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Stake Amount</p>
                  <p className="text-gray-900">{formatSUI(event.stake_amount)} SUI</p>
                </div>
              </div>

              <div className="flex items-start">
                <Users className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Participants</p>
                  <p className="text-gray-900">{(event.participants as string[])?.length || 0} / {event.capacity === '0' ? '∞' : (event.capacity as string)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Users className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Attendees</p>
                  <p className="text-gray-900">{(event.attendees as string[])?.length || 0}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Coins className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Vault Balance</p>
                  <p className="text-gray-900">{formatSUI(event.vault)} SUI</p>
                </div>
              </div>
            </div>

            {(event.description as string) && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                <p className="text-gray-900">{event.description as string}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {!isParticipant && !eventStarted && !isCancelled && (
                <Button 
                  onClick={handleJoin} 
                  disabled={isJoining}
                  className="w-full"
                >
                  {isJoining ? 'Joining...' : `Join Event (${formatSUI(event.stake_amount)} SUI)`}
                </Button>
              )}

              {isParticipant && eventEnded && !isCancelled && !hasClaimed && (
                <Button 
                  onClick={handleClaim} 
                  disabled={isClaiming || !isAttendee}
                  className="w-full"
                >
                  {isClaiming ? 'Claiming...' : isAttendee ? 'Claim Rewards' : 'Did Not Attend'}
                </Button>
              )}

              {isParticipant && isCancelled && !hasClaimed && (
                <Button 
                  onClick={handleRefund} 
                  disabled={isRefunding}
                  className="w-full"
                >
                  {isRefunding ? 'Refunding...' : 'Get Refund'}
                </Button>
              )}

              {isOrganizer && (
                <Link href={`/checkin/${eventId}`}>
                  <Button variant="outline" className="w-full">
                    <QrCode className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* QR Code for Participants */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your QR Code</h2>
            
            {generateQRCode() && (
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                  <QRCodeSVG value={generateQRCode()!} size={200} />
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Show this QR code to the organizer to mark your attendance
                </p>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Status</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Participant: {isParticipant ? 'Yes' : 'No'}</p>
                <p>• Attended: {isAttendee ? 'Yes' : 'No'}</p>
                <p>• Claimed: {hasClaimed ? 'Yes' : 'No'}</p>
                <p>• Event Status: {isCancelled ? 'Cancelled' : eventEnded ? 'Ended' : eventStarted ? 'In Progress' : 'Not Started'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}