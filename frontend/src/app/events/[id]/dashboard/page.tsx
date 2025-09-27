'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { ArrowLeft, Users, UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';

interface Participant {
  address: string;
  joinTime: string;
  stakeAmount: string;
  isAttendee: boolean;
  hasClaimed: boolean;
}

interface PendingRequest {
  address: string;
  requestTime: string;
  stakeAmount: string;
}

interface Attendee {
  address: string;
  markedTime: string;
  stakeAmount: string;
  hasClaimed: boolean;
}

export default function OrganizerDashboard() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const params = useParams();
  const eventId = params.id as string;
  
  const { 
    markAttendance, 
    acceptRequests, 
    rejectRequests
  } = useShowUpTransactions();
  
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'participants' | 'requests' | 'attendees'>('participants');
  
  // Data states
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  
  // Selection states
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  
  // Loading states for batch operations
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [isAcceptingRequests, setIsAcceptingRequests] = useState(false);
  const [isRejectingRequests, setIsRejectingRequests] = useState(false);

  const processParticipantsData = useCallback((participantsArray: string[], attendeesArray: string[], claimedArray: string[], stakeAmount: string) => {
    const participantsData: Participant[] = participantsArray.map(address => ({
      address,
      joinTime: new Date().toLocaleString(), // TODO: Get actual join time from events
      stakeAmount: stakeAmount || '0',
      isAttendee: attendeesArray.includes(address),
      hasClaimed: claimedArray.includes(address),
    }));
    setParticipants(participantsData);
  }, []);

  const processPendingRequestsData = useCallback((pendingRequestsArray: string[], stakeAmount: string) => {
    const requestsData: PendingRequest[] = pendingRequestsArray.map(address => ({
      address,
      requestTime: new Date().toLocaleString(), // TODO: Get actual request time from events
      stakeAmount: stakeAmount || '0',
    }));
    setPendingRequests(requestsData);
  }, []);

  const processAttendeesData = useCallback((attendeesArray: string[], claimedArray: string[], stakeAmount: string) => {
    const attendeesData: Attendee[] = attendeesArray.map(address => ({
      address,
      markedTime: new Date().toLocaleString(), // TODO: Get actual marked time from events
      stakeAmount: stakeAmount || '0',
      hasClaimed: claimedArray.includes(address),
    }));
    setAttendees(attendeesData);
  }, []);

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!account || !suiClient) {
        setIsLoading(false);
        return;
      }

      try {
        const eventData = await suiClient.getObject({
          id: eventId,
          options: {
            showContent: true,
            showDisplay: true,
          },
        });

        if (eventData.data?.content && 'fields' in eventData.data.content) {
          const eventFields = eventData.data.content.fields as Record<string, unknown>;
          
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
          
          // Create event object
          const eventObject = {
            id: eventId,
            organizer: eventFields.organizer,
            name: eventFields.name,
            description: eventFields.description,
            location: eventFields.location,
            startTime: eventFields.start_time,
            endTime: eventFields.end_time,
            stakeAmount: eventFields.stake_amount,
            capacity: eventFields.capacity,
            mustRequestToJoin: eventFields.must_request_to_join,
            participants: participantsArray,
            attendees: attendeesArray,
            claimed: claimedArray,
            pendingRequests: pendingRequestsArray,
          };
          
          setEvent(eventObject);
          
          // Process data for each tab
          const stakeAmount = eventObject.stakeAmount as string;
          processParticipantsData(participantsArray, attendeesArray, claimedArray, stakeAmount);
          processPendingRequestsData(pendingRequestsArray, stakeAmount);
          processAttendeesData(attendeesArray, claimedArray, stakeAmount);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [account, suiClient, eventId, processParticipantsData, processPendingRequestsData, processAttendeesData]);

  // Check if user is organizer
  const isOrganizer = account?.address === (event?.organizer as string);

  // Batch operations
  const handleMarkAttendance = async () => {
    if (selectedParticipants.length === 0) return;
    
    setIsMarkingAttendance(true);
    try {
      await markAttendance(eventId, selectedParticipants);
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert(`Failed to mark attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMarkingAttendance(false);
      setSelectedParticipants([]);
    }
  };

  const handleAcceptRequests = async () => {
    if (selectedRequests.length === 0) return;
    
    setIsAcceptingRequests(true);
    try {
      await acceptRequests(eventId, selectedRequests);
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error accepting requests:', error);
      alert(`Failed to accept requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAcceptingRequests(false);
      setSelectedRequests([]);
    }
  };

  const handleRejectRequests = async () => {
    if (selectedRequests.length === 0) return;
    
    setIsRejectingRequests(true);
    try {
      await rejectRequests(eventId, selectedRequests);
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error rejecting requests:', error);
      alert(`Failed to reject requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRejectingRequests(false);
      setSelectedRequests([]);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatSUI = (mist: string) => {
    return (parseInt(mist) / 1_000_000_000).toFixed(3);
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to access the organizer dashboard</p>
          <WalletButton />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600 mb-6">The event you&apos;re looking for doesn&apos;t exist</p>
          <Link href="/events">
            <Button>Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only the event organizer can access this dashboard</p>
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
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href={`/events/${eventId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Event
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h1>
                <p className="text-gray-600">{event.name as string}</p>
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('participants')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'participants'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Participants ({participants.length})
            </button>
            {(event?.mustRequestToJoin as boolean) && (
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserPlus className="h-4 w-4 inline mr-2" />
                Pending Requests ({pendingRequests.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('attendees')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'attendees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Attendees ({attendees.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'participants' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
                {selectedParticipants.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{selectedParticipants.length} selected</span>
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
                        'Mark Selected as Attended'
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.length === participants.length && participants.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParticipants(participants.map(p => p.address));
                            } else {
                              setSelectedParticipants([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stake</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant) => (
                      <tr key={participant.address} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedParticipants.includes(participant.address)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParticipants([...selectedParticipants, participant.address]);
                              } else {
                                setSelectedParticipants(selectedParticipants.filter(addr => addr !== participant.address));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatAddress(participant.address)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.joinTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatSUI(participant.stakeAmount)} SUI
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {participant.isAttendee && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Attended
                              </span>
                            )}
                            {participant.hasClaimed && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Claimed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
                {selectedRequests.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{selectedRequests.length} selected</span>
                    <Button
                      onClick={handleAcceptRequests}
                      disabled={isAcceptingRequests}
                      className="bg-green-600 hover:bg-green-700 mr-2"
                    >
                      {isAcceptingRequests ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        'Accept Selected'
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
                        'Reject Selected'
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedRequests.length === pendingRequests.length && pendingRequests.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRequests(pendingRequests.map(r => r.address));
                            } else {
                              setSelectedRequests([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stake</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingRequests.map((request) => (
                      <tr key={request.address} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedRequests.includes(request.address)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRequests([...selectedRequests, request.address]);
                              } else {
                                setSelectedRequests(selectedRequests.filter(addr => addr !== request.address));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatAddress(request.address)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.requestTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatSUI(request.stakeAmount)} SUI
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'attendees' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Attendees</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marked Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stake</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendees.map((attendee) => (
                      <tr key={attendee.address} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatAddress(attendee.address)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendee.markedTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatSUI(attendee.stakeAmount)} SUI
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {attendee.hasClaimed && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Claimed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
