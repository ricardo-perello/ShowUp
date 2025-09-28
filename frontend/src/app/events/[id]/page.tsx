'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Coins, QrCode, CheckCircle, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';
import { QRCodeSVG } from 'qrcode.react';

export default function EventDetailsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const params = useParams();
  const eventId = params.id as string;
  
  const { joinEvent, requestToJoin, acceptRequests, rejectRequests, withdrawFromEvent, claimPendingStake, markAttendance, claim, refund, cancelEvent, getUserSUICoins, loading, error } = useShowUpTransactions();
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaimingPending, setIsClaimingPending] = useState(false);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState<'participants' | 'requests' | 'attendees'>('participants');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [isAcceptingRequests, setIsAcceptingRequests] = useState(false);
  const [isRejectingRequests, setIsRejectingRequests] = useState(false);

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
          console.log('📋 Pending requests type:', typeof eventFields.pending_requests, eventFields.pending_requests);
          console.log('📋 Must request to join:', eventFields.must_request_to_join);
          console.log('📋 Registration end time:', eventFields.registration_end_time);
          
          // Parse VecMaps to extract participant data
          const participantsVecMap = eventFields.participants as { fields?: { contents?: Array<{ fields: { key: string; value: boolean } }> } } | undefined;
          const attendeesVecMap = eventFields.attendees as { fields?: { contents?: Array<{ fields: { key: string; value: boolean } }> } } | undefined;
          const claimedVecMap = eventFields.claimed as { fields?: { contents?: Array<{ fields: { key: string; value: boolean } }> } } | undefined;
          const pendingRequestsVecMap = eventFields.pending_requests as { fields?: { contents?: Array<{ fields: { key: string; value: boolean } }> } } | undefined;
          
          // Extract participant addresses from VecMaps
          const participantsArray = participantsVecMap?.fields?.contents?.map(entry => entry.fields.key) || [];
          const attendeesArray = attendeesVecMap?.fields?.contents?.map(entry => entry.fields.key) || [];
          const claimedArray = claimedVecMap?.fields?.contents?.map(entry => entry.fields.key) || [];
          const pendingRequestsArray = pendingRequestsVecMap?.fields?.contents?.map(entry => entry.fields.key) || [];
          
          setPendingRequests(pendingRequestsArray);
          
          // Create a properly parsed event object
          const parsedEvent = {
            ...eventFields,
            participants: participantsArray,
            attendees: attendeesArray,
            claimed: claimedArray,
            pending_requests: pendingRequestsArray,
          };
          
          setEvent(parsedEvent);
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
      const result = await joinEvent(eventId);
      alert(`Successfully joined event! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
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
      const result = await claim(eventId) as { transactionId: string; message: string };
      alert(`Successfully claimed rewards! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
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
      const result = await refund(eventId) as { transactionId: string; message: string };
      alert(`Successfully refunded! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error refunding:', err);
      alert(`Failed to refund: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRefunding(false);
    }
  };

  // NEW: Request to join private event
  const handleRequestToJoin = async () => {
    if (!account || !event) return;

    setIsRequesting(true);
    try {
      const result = await requestToJoin(eventId);
      alert(`Request submitted! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error requesting to join:', err);
      alert(`Failed to request to join: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRequesting(false);
    }
  };


  // NEW: Withdraw from event
  const handleWithdraw = async () => {
    if (!account) return;

    setIsWithdrawing(true);
    try {
      const result = await withdrawFromEvent(eventId);
      alert(`Withdrawn from event! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error withdrawing:', err);
      alert(`Failed to withdraw: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // NEW: Claim pending stake
  const handleClaimPendingStake = async () => {
    if (!account) return;

    setIsClaimingPending(true);
    try {
      const result = await claimPendingStake(eventId);
      alert(`Pending stake claimed! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error claiming pending stake:', err);
      alert(`Failed to claim pending stake: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsClaimingPending(false);
    }
  };

  // NEW: Mark attendance (organizer only)
  const handleMarkAttendance = async () => {
    if (!account || selectedParticipants.length === 0) return;

    setIsMarkingAttendance(true);
    try {
      const result = await markAttendance(eventId, selectedParticipants);
      alert(`Attendance marked! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error marking attendance:', err);
      alert(`Failed to mark attendance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  // NEW: Accept requests (organizer only)
  const handleAcceptRequests = async () => {
    if (!account || selectedRequests.length === 0) return;

    setIsAcceptingRequests(true);
    try {
      const result = await acceptRequests(eventId, selectedRequests);
      alert(`Requests accepted! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
      // Clear selection and refresh event data
      setSelectedRequests([]);
      window.location.reload();
    } catch (err) {
      console.error('Error accepting requests:', err);
      alert(`Failed to accept requests: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAcceptingRequests(false);
    }
  };

  // NEW: Reject requests (organizer only)
  const handleRejectRequests = async () => {
    if (!account || selectedRequests.length === 0) return;

    setIsRejectingRequests(true);
    try {
      const result = await rejectRequests(eventId, selectedRequests);
      alert(`Requests rejected! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
      // Clear selection and refresh event data
      setSelectedRequests([]);
      window.location.reload();
    } catch (err) {
      console.error('Error rejecting requests:', err);
      alert(`Failed to reject requests: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRejectingRequests(false);
    }
  };

  // NEW: Cancel event (organizer only)
  const handleCancelEvent = async () => {
    if (!account) return;

    if (!confirm('Are you sure you want to cancel this event? This action cannot be undone and all participants will be able to get refunds.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelEvent(eventId);
      alert(`Event cancelled! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
      
      // Refresh event data
      window.location.reload();
    } catch (err) {
      console.error('Error cancelling event:', err);
      alert(`Failed to cancel event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCancelling(false);
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

  // Event status logic (same as events page)
  const getEventStatus = () => {
    const now = Math.floor(Date.now() / 1000);
    const startTime = parseInt(event.start_time as string);
    const registrationStartTime = parseInt(event.registration_start_time as string);
    const registrationEndTime = parseInt(event.registration_end_time as string);
    const endTime = parseInt(event.end_time as string);
    
    // Debug logging
    console.log('🕐 Event Status Debug:', {
      now: new Date(now * 1000).toLocaleString(),
      startTime: new Date(startTime * 1000).toLocaleString(),
      registrationStartTime: new Date(registrationStartTime * 1000).toLocaleString(),
      registrationEndTime: new Date(registrationEndTime * 1000).toLocaleString(),
      endTime: new Date(endTime * 1000).toLocaleString(),
      nowUnix: now,
      endTimeUnix: endTime,
      hasEnded: now >= endTime
    });
    
    if (now < registrationStartTime) return 'registration_not_started';
    if (now >= registrationStartTime && now < registrationEndTime) return 'upcoming';
    if (now >= registrationEndTime && now < startTime) return 'registration_closed';
    if (now >= startTime && now < endTime) return 'ongoing';
    if (now >= endTime) return 'ended';
    return 'unknown';
  };

  const eventStatus = getEventStatus();
  const eventStarted = eventStatus === 'ongoing' || eventStatus === 'ended';
  const isCancelled = parseInt(event.end_time as string) === 0;
  const canJoin = !isOrganizer && !isParticipant && eventStatus === 'upcoming' && !isCancelled && !Boolean(event.must_request_to_join);
  const hasPendingRequest = pendingRequests.includes(account?.address || '');
  const canRequest = !isOrganizer && !isParticipant && !hasPendingRequest && eventStatus === 'upcoming' && !isCancelled && Boolean(event.must_request_to_join);
  
  // Check if user can claim pending stake (registration ended, has pending request, not already claimed)
  const canClaimPendingStake = !isOrganizer && 
                              !isParticipant && 
                              pendingRequests.includes(account?.address || '') && 
                              eventStatus !== 'upcoming' && // Registration has ended
                              !isCancelled;
  
  // Debug logging
  console.log('🎯 Event Status Result:', {
    eventStatus,
    eventStarted,
    isCancelled,
    isOrganizer,
    isParticipant,
    isAttendee,
    hasClaimed,
    hasPendingRequest,
    canJoin,
    canRequest,
    canClaimPendingStake,
    pendingRequests: pendingRequests.length,
    showMarkAttendance: isOrganizer && eventStatus !== 'ended'
  });

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                  <p className="text-sm font-medium text-gray-500">Registration Closes</p>
                  <p className="text-gray-900">{formatTime(event.registration_end_time)}</p>
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
                <div className="h-5 w-5 text-gray-400 mt-1 mr-3 flex items-center justify-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    event.must_request_to_join ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {event.must_request_to_join ? 'Private' : 'Public'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Event Type</p>
                  <p className="text-gray-900">{event.must_request_to_join ? 'Private Event (requires approval)' : 'Public Event (direct join)'}</p>
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
                  <p className="text-sm font-medium text-gray-500">Participant Vault</p>
                  <p className="text-gray-900">{formatSUI(event.participant_vault)} SUI</p>
                </div>
              </div>

              <div className="flex items-start">
                <Coins className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Vault</p>
                  <p className="text-gray-900">{formatSUI(event.pending_vault)} SUI</p>
                </div>
              </div>

              <div className="flex items-start">
                <Users className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                  <p className="text-gray-900">{pendingRequests.length} requests</p>
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
              {/* Join/Request buttons for non-participants (not organizers) */}
              {canJoin && (
                <Button 
                  onClick={handleJoin} 
                  disabled={isJoining}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isJoining ? 'Joining...' : `Join Event (${formatSUI(event.stake_amount)} SUI)`}
                </Button>
              )}
              
              {canRequest && (
                <Button 
                  onClick={handleRequestToJoin} 
                  disabled={isRequesting}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isRequesting ? 'Requesting...' : `Request to Join (${formatSUI(event.stake_amount)} SUI)`}
                </Button>
              )}

              {/* Withdraw button for participants before event starts and haven't claimed */}
              {isParticipant && !eventStarted && !isCancelled && !hasClaimed && !isAttendee && (
                <Button 
                  onClick={handleWithdraw} 
                  disabled={isWithdrawing}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw from Event'}
                </Button>
              )}

              {/* Claim buttons for participants after event ends */}
              {isParticipant && eventStatus === 'ended' && !isCancelled && !hasClaimed && (
                <Button 
                  onClick={handleClaim} 
                  disabled={isClaiming || !isAttendee}
                  className="w-full"
                >
                  {isClaiming ? 'Claiming...' : isAttendee ? 'Claim Rewards' : 'Did Not Attend'}
                </Button>
              )}

              {/* Refund button for cancelled events */}
              {isParticipant && isCancelled && !hasClaimed && (
                <Button 
                  onClick={handleRefund} 
                  disabled={isRefunding}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  {isRefunding ? 'Refunding...' : 'Get Refund'}
                </Button>
              )}

              {/* Claim pending stake button */}
              {canClaimPendingStake && (
                <Button 
                  onClick={handleClaimPendingStake} 
                  disabled={isClaimingPending}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  {isClaimingPending ? 'Claiming...' : 'Claim Pending Stake'}
                </Button>
              )}

              {/* Organizer buttons */}
              {isOrganizer && (
                <>
                  {/* Dashboard button */}
                  <Link href={`/events/${eventId}/dashboard`}>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <Users className="h-4 w-4 mr-2" />
                      Organizer Dashboard
                    </Button>
                  </Link>
                  
                  {/* Cancel Event button - only show if event hasn't ended and not already cancelled */}
                  {eventStatus !== 'ended' && !isCancelled && (
                    <Button 
                      onClick={handleCancelEvent} 
                      disabled={isCancelling}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {isCancelling ? 'Cancelling...' : 'Cancel Event'}
                    </Button>
                  )}
                  
                  {/* Mark Attendance button - only show if event hasn't ended */}
                  {eventStatus !== 'ended' && (
                    <Link href={`/checkin/${eventId}`}>
                      <Button variant="outline" className="w-full">
                        <QrCode className="h-4 w-4 mr-2" />
                        Mark Attendance
                      </Button>
                    </Link>
                  )}
                  
                  {/* Pending requests management */}
                  {pendingRequests.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Pending Requests ({pendingRequests.length})</h3>
                      <div className="space-y-2">
                        {pendingRequests.map((address, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{formatAddress(address)}</span>
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedParticipants([address]);
                                  handleAcceptRequests();
                                }}
                                disabled={isMarkingAttendance}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedParticipants([address]);
                                  handleRejectRequests();
                                }}
                                disabled={isMarkingAttendance}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* QR Code for Participants (not organizers) */}
          {!isOrganizer && (
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
                  <p>• Requested: {hasPendingRequest ? 'Yes' : 'No'}</p>
                  <p>• Event Status: {isCancelled ? 'Cancelled' : eventStatus === 'ended' ? 'Ended' : eventStatus === 'ongoing' ? 'In Progress' : 'Not Started'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Organizer Dashboard - Right Column */}
          {isOrganizer && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Organizer Dashboard</h2>
              
              {/* Dashboard Tabs */}
              <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('participants')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'participants'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Participants ({(event.participants as string[])?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'requests'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Requests ({pendingRequests.length})
                </button>
                <button
                  onClick={() => setActiveTab('attendees')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'attendees'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Attendees ({(event.attendees as string[])?.length || 0})
                </button>
              </div>

              {/* Participants Tab */}
              {activeTab === 'participants' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Participants</h3>
                    {selectedParticipants.length > 0 && eventStatus !== 'ended' && (
                      <Button
                        onClick={handleMarkAttendance}
                        disabled={isMarkingAttendance}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isMarkingAttendance ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Marking...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Selected as Attended ({selectedParticipants.length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {(event.participants as string[])?.map((address, index) => {
                      const isAttendee = (event.attendees as string[])?.includes(address) || false;
                      const hasClaimed = (event.claimed as string[])?.includes(address) || false;
                      const isSelected = selectedParticipants.includes(address);
                      
                      return (
                        <div
                          key={address}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParticipants([...selectedParticipants, address]);
                                } else {
                                  setSelectedParticipants(selectedParticipants.filter(addr => addr !== address));
                                }
                              }}
                              disabled={eventStatus === 'ended'}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {address.slice(0, 6)}...{address.slice(-4)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatSUI(event.stake_amount)} SUI • {isAttendee ? 'Attended' : 'Not Attended'} • {hasClaimed ? 'Claimed' : 'Not Claimed'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isAttendee && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {hasClaimed && (
                              <Coins className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Requests Tab */}
              {activeTab === 'requests' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Pending Requests</h3>
                    {selectedRequests.length > 0 && eventStatus !== 'ended' && (
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleAcceptRequests}
                          disabled={isAcceptingRequests}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isAcceptingRequests ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept Selected ({selectedRequests.length})
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleRejectRequests}
                          disabled={isRejectingRequests}
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          {isRejectingRequests ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Rejecting...
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Reject Selected ({selectedRequests.length})
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {pendingRequests.map((address, index) => {
                      const isSelected = selectedRequests.includes(address);
                      
                      return (
                        <div
                          key={address}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRequests([...selectedRequests, address]);
                                } else {
                                  setSelectedRequests(selectedRequests.filter(addr => addr !== address));
                                }
                              }}
                              disabled={eventStatus === 'ended'}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {address.slice(0, 6)}...{address.slice(-4)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatSUI(event.stake_amount)} SUI • Pending Approval
                              </p>
                            </div>
                          </div>
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        </div>
                      );
                    })}
                    
                    {pendingRequests.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No pending requests</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attendees Tab */}
              {activeTab === 'attendees' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Attendees</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {(event.attendees as string[])?.map((address, index) => {
                      const hasClaimed = (event.claimed as string[])?.includes(address) || false;
                      
                      return (
                        <div
                          key={address}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {address.slice(0, 6)}...{address.slice(-4)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatSUI(event.stake_amount)} SUI • {hasClaimed ? 'Claimed Rewards' : 'Not Claimed'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            {hasClaimed && (
                              <Coins className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {((event.attendees as string[])?.length || 0) === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No attendees yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}