import { useState, useCallback } from 'react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { transactionExecutor } from '@/lib/transactionExecutor';
import { PACKAGE_ID, getEventType, parseEventFromObject, EventObject, queryNetworkEvents, EVENT_TYPES } from '@/lib/sui';

export function useShowUpTransactions() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  
  console.log('🔍 useShowUpTransactions - Account:', account?.address);
  console.log('🔍 useShowUpTransactions - SuiClient:', !!suiClient);
  
  const { mutate: signAndExecuteTransaction, isPending } = useSignAndExecuteTransaction({
    onSuccess: (result) => {
      console.log('✅ Transaction successful:', result);
    },
    onError: (error) => {
      console.error('❌ Transaction failed:', error);
      setError(error.message || 'Transaction failed');
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error after 5 seconds
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown) => {
    console.error('ShowUp error:', err);
    setError(err instanceof Error ? err.message : 'An unexpected error occurred');
  }, []);

  // Create event
    const createEvent = useCallback(async (params: {
      name: string;
      description: string;
      location: string;
      stakeAmount: number;
      capacity: number;
      registrationStartTime: Date; // NEW: When registration opens
      registrationEndTime: Date;   // NEW: When registration closes
      eventStartTime: Date;        // NEW: When event starts
      eventEndTime: Date;          // NEW: When event ends
      mustRequestToJoin: boolean; // NEW: Public vs private event
    }) => {
    console.log('🚀 Starting createEvent with params:', params);
    console.log('👤 Account:', account?.address);
    
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      // Check gas coins first
      console.log('🔍 Checking gas coins...');
      const gasCoins = await getUserSUICoins(100000000); // 0.1 SUI minimum
      if (gasCoins.length === 0) {
        throw new Error('No suitable gas coins found. You need at least 0.1 SUI for gas.');
      }
      console.log('✅ Gas coins available:', gasCoins.length);

      // Get current Sui epoch from network first
      const currentEpoch = await transactionExecutor.getCurrentSuiEpoch(suiClient);
      
      // Convert Date objects to Unix timestamps, then to Sui epochs
      const registrationStartEpoch = transactionExecutor.unixToSuiEpoch(Math.floor(params.registrationStartTime.getTime() / 1000));
      const registrationEndEpoch = transactionExecutor.unixToSuiEpoch(Math.floor(params.registrationEndTime.getTime() / 1000));
      const startEpoch = transactionExecutor.unixToSuiEpoch(Math.floor(params.eventStartTime.getTime() / 1000));
      const endEpoch = transactionExecutor.unixToSuiEpoch(Math.floor(params.eventEndTime.getTime() / 1000));
      
      console.log('⏰ Event timing:', { 
        currentEpoch,
        registrationStartEpoch, 
        registrationEndEpoch,
        startEpoch, 
        endEpoch,
        registrationStartTime: params.registrationStartTime,
        registrationEndTime: params.registrationEndTime,
        eventStartTime: params.eventStartTime,
        eventEndTime: params.eventEndTime,
        mustRequestToJoin: params.mustRequestToJoin
      });

      const tx = transactionExecutor.createEventTransaction({
        name: params.name,
        description: params.description,
        location: params.location,
        startTime: startEpoch,
        registrationStartTime: registrationStartEpoch, // NEW: When registration opens
        registrationEndTime: registrationEndEpoch,   // NEW: When registration closes
        endTime: endEpoch,
        stakeAmount: params.stakeAmount,
        capacity: params.capacity,
        mustRequestToJoin: params.mustRequestToJoin, // NEW
      });

      console.log('📝 Transaction created, executing...');

      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Create event transaction result:', result);
            // Extract event ID from the transaction result
            let eventId = 'pending';
            console.log('🔍 Extracting event ID from result:', result);
            
            if (result.effects && typeof result.effects === 'object' && 'created' in result.effects) {
              const createdObjects = (result.effects as Record<string, unknown>).created;
              console.log('🔍 Created objects:', createdObjects);
              
              if (Array.isArray(createdObjects)) {
                for (const obj of createdObjects) {
                  console.log('🔍 Checking object:', obj);
                  if (obj && typeof obj === 'object' && 'reference' in obj) {
                    const ref = (obj as { reference: { objectId?: string } }).reference;
                    if (ref && ref.objectId) {
                      eventId = ref.objectId;
                      console.log('✅ Found event ID:', eventId);
                      break;
                    }
                  }
                }
              }
            }
            
            // If we still don't have a valid event ID, try to get it from objectChanges
            if (eventId === 'pending' && result.objectChanges) {
              console.log('🔍 Trying objectChanges:', result.objectChanges);
              const objectChanges = result.objectChanges as Array<{ type: string; objectId?: string; objectType?: string }>;
              for (const change of objectChanges) {
                if (change.type === 'created' && change.objectType && change.objectType.includes('Event')) {
                  eventId = change.objectId || 'pending';
                  console.log('✅ Found event ID from objectChanges:', eventId);
                  break;
                }
              }
            }
            
            console.log('🎉 Event created with ID:', eventId);
            
            // Add the new event ID to the cache
            if (eventId !== 'pending') {
              setDiscoveredEventIds(prev => {
                const updated = [...new Set([...prev, eventId])];
                console.log('💾 Added new event to cache:', eventId, 'Total cached:', updated.length);
                return updated;
              });
            }
            
            resolve({
              eventId,
              transactionId: result.digest || 'pending',
              message: 'Event created successfully!',
            });
          },
          onError: (error) => {
            console.error('❌ Create event failed:', error);
            setError(error.message || 'Failed to create event');
            reject(error);
          }
        });
      });
    } catch (err) {
      console.error('💥 Create event error:', err);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // Get user's SUI coins
  const getUserSUICoins = useCallback(async (minAmount: number) => {
    if (!account) throw new Error('Wallet not connected');
    
    try {
      console.log('💰 Getting SUI coins for account:', account.address);
      const coins = await suiClient.getCoins({
        owner: account.address,
        coinType: '0x2::sui::SUI',
      });

      console.log('💰 Available coins:', coins.data.map(coin => ({
        id: coin.coinObjectId,
        balance: coin.balance,
        balanceInSUI: (parseInt(coin.balance) / 1_000_000_000).toFixed(4)
      })));

      // Filter coins that have enough balance
      const suitableCoins = coins.data
        .filter(coin => parseInt(coin.balance) >= minAmount)
        .map(coin => coin.coinObjectId);

      console.log('💰 Suitable coins for min amount', minAmount, ':', suitableCoins);
      return suitableCoins;
    } catch (err) {
      console.error('💰 Error getting SUI coins:', err);
      handleError(err);
      return [];
    }
  }, [account, suiClient, handleError]);

  // Join event
  const joinEvent = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the event to check stake amount
      const eventData = await suiClient.getObject({
        id: eventId,
        options: { showContent: true, showType: true }
      });

      if (!eventData.data?.content || !('fields' in eventData.data.content)) {
        throw new Error('Event not found');
      }

      const eventFields = eventData.data.content.fields as Record<string, unknown>;
      const stakeAmount = parseInt(String(eventFields.stake_amount || '0'));
      const gasAmount = 100000000; // 0.1 SUI for gas
      const totalNeeded = stakeAmount + gasAmount;

      console.log('💰 Join event requirements:', {
        stakeAmount: stakeAmount / 1_000_000_000 + ' SUI',
        gasAmount: gasAmount / 1_000_000_000 + ' SUI',
        totalNeeded: totalNeeded / 1_000_000_000 + ' SUI'
      });

      // Check if we have enough balance
      console.log('🔍 Checking available coins...');
      const allCoins = await getUserSUICoins(totalNeeded);
      if (allCoins.length === 0) {
        throw new Error(`Insufficient SUI balance. You need at least ${totalNeeded / 1_000_000_000} SUI (${stakeAmount / 1_000_000_000} for stake + ${gasAmount / 1_000_000_000} for gas).`);
      }
      console.log('✅ Available coins:', allCoins.length);

      // Create transaction with proper coin splitting
      const tx = new Transaction();
      
      // Split the gas coin to create a specific coin for staking
      const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(stakeAmount)]);
      
      tx.moveCall({
        target: `${PACKAGE_ID}::showup::join_event`,
        arguments: [
          tx.object(eventId),
          stakeCoin, // Use the split coin for staking
          tx.object('0x6'), // Clock object at address 0x6
        ],
      });

      // Set gas budget
      tx.setGasBudget(100000000); // 0.1 SUI in MIST

      console.log('📝 Join event transaction created, executing...');

      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Join event transaction result:', result);
            resolve({
              transactionId: result.digest,
              message: 'Successfully joined event!',
            });
          },
          onError: (error) => {
            console.error('❌ Join event transaction failed:', error);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError, suiClient, getUserSUICoins]);

  // Mark attendance (updated to handle multiple participants)
  const markAttendance = useCallback(async (eventId: string, participants: string[]): Promise<{ transactionId: string; [key: string]: unknown }> => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.markAttendedTransaction(eventId, participants);

      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Mark attendance transaction result:', result);
            resolve({
              transactionId: result.digest,
              ...result
            });
          },
          onError: (error) => {
            console.error('❌ Mark attendance transaction failed:', error);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // Claim rewards
  const claim = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.claimTransaction(eventId, account.address);

      // Execute the transaction and wait for result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Claim transaction successful:', result);
            setLoading(false);
            resolve({
              transactionId: result.digest,
              message: 'Successfully claimed rewards!',
            });
          },
          onError: (error) => {
            console.error('❌ Claim transaction failed:', error);
            setError(error.message || 'Transaction failed');
            setLoading(false);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      setLoading(false);
      throw err;
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // Refund
  const refund = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.refundTransaction(eventId, account.address);

      // Execute the transaction and wait for result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Refund transaction successful:', result);
            setLoading(false);
            resolve({
              transactionId: result.digest,
              message: 'Successfully refunded!',
            });
          },
          onError: (error) => {
            console.error('❌ Refund transaction failed:', error);
            setError(error.message || 'Transaction failed');
            setLoading(false);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      setLoading(false);
      throw err;
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // Cancel event
  const cancelEvent = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.cancelEventTransaction(eventId);

      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Cancel event transaction result:', result);
            resolve({
              transactionId: result.digest,
              message: 'Event cancelled successfully!',
            });
          },
          onError: (error) => {
            console.error('❌ Cancel event transaction failed:', error);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // Get event data
  const getEvent = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    try {
      const event = await suiClient.getObject({
        id: eventId,
        options: {
          showContent: true,
          showDisplay: true,
          showType: true,
        },
      });
      return event;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [account, suiClient, handleError]);

  // Get all events from the blockchain
  const getAllEvents = useCallback(async (): Promise<EventObject[]> => {
    try {
      console.log('🔍 Getting events for account:', account?.address);
      const eventType = getEventType(PACKAGE_ID);
      console.log('📦 Event type:', eventType);
      
      // Query all objects of type Event
      const response = await suiClient.getOwnedObjects({
        owner: account?.address || '', // This will get events owned by the current user
        options: {
          showContent: true,
          showType: true,
        },
        filter: {
          StructType: eventType,
        },
      });

      console.log('📊 Raw response:', response);
      console.log('📊 Response data length:', response.data.length);

      // Parse the events
      const events: EventObject[] = [];
      
      for (const item of response.data) {
        console.log('📄 Processing item:', item);
        if (item.data) {
          try {
            const event = parseEventFromObject(item.data as unknown as Record<string, unknown>);
            console.log('✅ Parsed event:', event);
            events.push(event);
          } catch (err) {
            console.warn('❌ Failed to parse event:', err);
          }
        }
      }

      console.log('🎉 Final events array:', events);
      return events;
    } catch (err) {
      console.error('💥 Error in getAllEvents:', err);
      handleError(err);
      return [];
    }
  }, [account, suiClient, handleError]);

  // Simple cache for discovered events
  const [discoveredEventIds, setDiscoveredEventIds] = useState<string[]>([]);

  // Get all events (not just owned by user) - query all Event objects
  const getAllEventsGlobal = useCallback(async (): Promise<EventObject[]> => {
    try {
      console.log('🔍 Getting all events globally...');
      const eventType = getEventType(PACKAGE_ID);
      console.log('📦 Event type:', eventType);
      
      // Method 1: Query recent transactions to find event creation
      console.log('🔍 Querying recent transactions...');
      
      // Get recent transactions and look for both create_event and create_mock_event calls
      const recentTxs = await suiClient.queryTransactionBlocks({
        filter: {
          MoveFunction: {
            package: PACKAGE_ID,
            module: 'showup',
            function: 'create_event',
          },
        },
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
        limit: 50,
        order: 'descending',
      });

      // Also query for create_mock_event transactions
      const mockEventTxs = await suiClient.queryTransactionBlocks({
        filter: {
          MoveFunction: {
            package: PACKAGE_ID,
            module: 'showup',
            function: 'create_mock_event',
          },
        },
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
        limit: 50,
        order: 'descending',
      });

      // Combine both transaction results
      const allTxs = [...recentTxs.data, ...mockEventTxs.data];

      console.log('📊 All transactions (create_event + create_mock_event):', allTxs);
      
      // Extract event IDs from transaction effects
      const eventIds: string[] = [];
      
      for (const tx of allTxs) {
        console.log('📄 Processing transaction:', tx.digest);
        
        if (tx.objectChanges) {
          for (const change of tx.objectChanges) {
            if (change.type === 'created' && 
                change.objectType === eventType) {
              console.log('✅ Found Event object creation:', change.objectId);
              eventIds.push(change.objectId);
            }
          }
        }
      }

      console.log('📋 Found event IDs:', eventIds);

      // Update cache with new event IDs
      if (eventIds.length > 0) {
        setDiscoveredEventIds(prev => {
          const combined = [...new Set([...prev, ...eventIds])];
          console.log('💾 Updated event cache:', combined);
          return combined;
        });
      }

      // Use new event IDs if found, otherwise use empty array (don't rely on state)
      const eventIdsToFetch = eventIds.length > 0 ? eventIds : [];
      console.log('🎯 Event IDs to fetch:', eventIdsToFetch);

      // Method 2: If no events found via query, try alternative approaches
      if (eventIdsToFetch.length === 0) {
        console.log('🔍 No events found via query or cache, trying alternative approaches...');
        
        // Try to get events from the current user as fallback
        const userEvents = await getAllEvents();
        console.log('👤 User events found:', userEvents.length);
        
        // In a real app, you might also want to:
        // 1. Query from a list of known addresses
        // 2. Use an indexer service
        // 3. Store event IDs in a separate registry
        
        return userEvents;
      }

      // Fetch the actual event objects
      const events: EventObject[] = [];
      
      for (const eventId of eventIdsToFetch) {
        try {
          console.log('🔍 Fetching event object:', eventId);
          const eventData = await suiClient.getObject({
            id: eventId,
            options: {
              showContent: true,
              showType: true,
            },
          });

          if (eventData.data) {
            const event = parseEventFromObject(eventData.data as unknown as Record<string, unknown>);
            console.log('✅ Parsed event:', event);
            events.push(event);
          }
        } catch (err) {
          console.warn('❌ Failed to fetch event:', eventId, err);
        }
      }

      console.log('🎉 Final events array:', events);
      return events;
    } catch (err) {
      console.error('❌ Error getting all events:', err);
      handleError(err);
      return [];
    }
  }, [suiClient, handleError, getAllEvents]);

  // Function to refresh the global events cache
  const refreshGlobalEvents = useCallback(() => {
    console.log('🔄 Refreshing global events cache...');
    setDiscoveredEventIds([]); // Clear cache to force fresh query
  }, []);

  // NEW: Request to join private event
  const requestToJoin = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the event to check stake amount
      const eventData = await suiClient.getObject({
        id: eventId,
        options: { showContent: true, showType: true }
      });

      if (!eventData.data?.content || !('fields' in eventData.data.content)) {
        throw new Error('Event not found');
      }

      const eventFields = eventData.data.content.fields as Record<string, unknown>;
      const stakeAmount = parseInt(String(eventFields.stake_amount || '0'));
      const gasAmount = 100000000; // 0.1 SUI for gas
      const totalNeeded = stakeAmount + gasAmount;

      // Check if we have enough balance
      const allCoins = await getUserSUICoins(totalNeeded);
      if (allCoins.length === 0) {
        throw new Error(`Insufficient SUI balance. You need at least ${totalNeeded / 1_000_000_000} SUI (${stakeAmount / 1_000_000_000} for stake + ${gasAmount / 1_000_000_000} for gas).`);
      }

      // Create transaction with proper coin splitting
      const tx = new Transaction();
      const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(stakeAmount)]);
      
      tx.moveCall({
        target: `${PACKAGE_ID}::showup::request_to_join`,
        arguments: [
          tx.object(eventId),
          stakeCoin,
          tx.object('0x6'), // Clock object at address 0x6
        ],
      });

      tx.setGasBudget(100000000);

      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Request to join transaction result:', result);
            resolve({
              transactionId: result.digest,
              message: 'Request to join submitted! Wait for organizer approval.',
            });
          },
          onError: (error) => {
            console.error('❌ Request to join transaction failed:', error);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError, suiClient, getUserSUICoins]);

  // NEW: Accept requests (organizer only)
  const acceptRequests = useCallback(async (eventId: string, participants: string[]) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.acceptRequestsTransaction(eventId, participants);
      
      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Accept requests transaction result:', result);
            resolve({
              transactionId: result.digest,
              message: 'Requests accepted successfully!',
            });
          },
          onError: (error) => {
            console.error('❌ Accept requests transaction failed:', error);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // NEW: Reject requests (organizer only)
  const rejectRequests = useCallback(async (eventId: string, participants: string[]) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.rejectRequestsTransaction(eventId, participants);
      
      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Reject requests transaction result:', result);
            resolve({
              transactionId: result.digest,
              message: 'Requests rejected successfully!',
            });
          },
          onError: (error) => {
            console.error('❌ Reject requests transaction failed:', error);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // NEW: Withdraw from event
  const withdrawFromEvent = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.withdrawFromEventTransaction(eventId);
      
      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Withdraw from event transaction result:', result);
            resolve({
              transactionId: result.digest,
              message: 'Withdrawn from event successfully!',
            });
          },
          onError: (error) => {
            console.error('❌ Withdraw from event transaction failed:', error);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // NEW: Claim pending stake
  const claimPendingStake = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.claimPendingStakeTransaction(eventId);
      
      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Claim pending stake transaction result:', result);
            resolve({
              transactionId: result.digest,
              message: 'Pending stake claimed successfully!',
            });
          },
          onError: (error) => {
            console.error('❌ Claim pending stake transaction failed:', error);
            reject(error);
          }
        });
      });
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // NEW: Create funded mock event
  const createFundedMockEvent = useCallback(async (params: {
    name: string;
    description: string;
    location: string;
    stakeAmount: number; // in SUI
    capacity: number;
    registrationStartTime: Date;
    registrationEndTime: Date;
    eventStartTime: Date;
    eventEndTime: Date;
    mustRequestToJoin: boolean;
    participants: string[];
    attendees: string[];
    pending: string[];
    participantFundAmount: number; // in SUI
    pendingFundAmount: number; // in SUI
  }) => {
    console.log('🚀 Starting createFundedMockEvent with params:', params);
    console.log('👤 Account:', account?.address);
    
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      // Check gas coins first
      console.log('🔍 Checking gas coins...');
      const totalNeeded = (params.participantFundAmount + params.pendingFundAmount) * 1_000_000_000 + 100000000; // Convert to MIST + gas
      const gasCoins = await getUserSUICoins(totalNeeded);
      if (gasCoins.length === 0) {
        throw new Error(`Insufficient SUI balance. You need at least ${totalNeeded / 1_000_000_000} SUI for funding + gas.`);
      }
      console.log('✅ Gas coins available:', gasCoins.length);

      // Get current Sui epoch from network first
      const currentEpoch = await transactionExecutor.getCurrentSuiEpoch(suiClient);
      
      // Convert Date objects to Unix timestamps, then to Sui epochs
      const registrationStartEpoch = transactionExecutor.unixToSuiEpoch(Math.floor(params.registrationStartTime.getTime() / 1000));
      const registrationEndEpoch = transactionExecutor.unixToSuiEpoch(Math.floor(params.registrationEndTime.getTime() / 1000));
      const startEpoch = transactionExecutor.unixToSuiEpoch(Math.floor(params.eventStartTime.getTime() / 1000));
      const endEpoch = transactionExecutor.unixToSuiEpoch(Math.floor(params.eventEndTime.getTime() / 1000));
      
      console.log('⏰ Event timing:', { 
        currentEpoch,
        registrationStartEpoch, 
        registrationEndEpoch,
        startEpoch, 
        endEpoch,
        participantFundAmount: params.participantFundAmount,
        pendingFundAmount: params.pendingFundAmount
      });

      const tx = transactionExecutor.createFundedMockEventTransaction({
        name: params.name,
        description: params.description,
        location: params.location,
        startTime: startEpoch,
        registrationStartTime: registrationStartEpoch,
        registrationEndTime: registrationEndEpoch,
        endTime: endEpoch,
        stakeAmount: Math.floor(params.stakeAmount * 1_000_000_000), // Convert to MIST
        capacity: params.capacity,
        mustRequestToJoin: params.mustRequestToJoin,
        participants: params.participants,
        attendees: params.attendees,
        pending: params.pending,
        participantFundAmount: Math.floor(params.participantFundAmount * 1_000_000_000), // Convert to MIST
        pendingFundAmount: Math.floor(params.pendingFundAmount * 1_000_000_000), // Convert to MIST
      });

      console.log('📝 Transaction created, executing...');

      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Create funded mock event transaction result:', result);
            // Extract event ID from the transaction result
            let eventId = 'pending';
            console.log('🔍 Extracting event ID from result:', result);
            
            if (result.effects && typeof result.effects === 'object' && 'created' in result.effects) {
              const createdObjects = (result.effects as Record<string, unknown>).created;
              console.log('🔍 Created objects:', createdObjects);
              
              if (Array.isArray(createdObjects)) {
                for (const obj of createdObjects) {
                  console.log('🔍 Checking object:', obj);
                  if (obj && typeof obj === 'object' && 'reference' in obj) {
                    const ref = (obj as { reference: { objectId?: string } }).reference;
                    if (ref && ref.objectId) {
                      eventId = ref.objectId;
                      console.log('✅ Found event ID:', eventId);
                      break;
                    }
                  }
                }
              }
            }
            
            // If we still don't have a valid event ID, try to get it from objectChanges
            if (eventId === 'pending' && result.objectChanges) {
              console.log('🔍 Trying objectChanges:', result.objectChanges);
              const objectChanges = result.objectChanges as Array<{ type: string; objectId?: string; objectType?: string }>;
              for (const change of objectChanges) {
                if (change.type === 'created' && change.objectType && change.objectType.includes('Event')) {
                  eventId = change.objectId || 'pending';
                  console.log('✅ Found event ID from objectChanges:', eventId);
                  break;
                }
              }
            }
            
            console.log('🎉 Funded mock event created with ID:', eventId);
            
            // Add the new event ID to the cache
            if (eventId !== 'pending') {
              setDiscoveredEventIds(prev => {
                const updated = [...new Set([...prev, eventId])];
                console.log('💾 Added new event to cache:', eventId, 'Total cached:', updated.length);
                return updated;
              });
            }
            
            resolve({
              eventId,
              transactionId: result.digest || 'pending',
              message: 'Funded mock event created successfully!',
            });
          },
          onError: (error) => {
            console.error('❌ Create funded mock event failed:', error);
            setError(error.message || 'Failed to create funded mock event');
            reject(error);
          }
        });
      });
    } catch (err) {
      console.error('💥 Create funded mock event error:', err);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError, suiClient, getUserSUICoins]);

  // Create private mock event for testing request workflow
  const createPrivateMockEvent = useCallback(async () => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🎯 Creating private mock event...');
      
      // Check SUI balance
      const requiredAmount = 3 * 1000000000; // 3 SUI total (2 participants + 1 pending)
      
      // Get actual coin data to check balance
      const coins = await suiClient.getCoins({
        owner: account.address,
        coinType: '0x2::sui::SUI',
      });
      
      if (!coins.data || coins.data.length === 0) {
        throw new Error('No SUI coins found. Please ensure you have SUI in your wallet.');
      }
      
      const totalBalance = coins.data.reduce((sum, coin) => sum + parseInt(coin.balance), 0);
      
      if (totalBalance < requiredAmount) {
        throw new Error(`Insufficient SUI balance. Required: ${requiredAmount / 1000000000} SUI, Available: ${totalBalance / 1000000000} SUI`);
      }
      
      console.log('💰 SUI balance check passed:', totalBalance / 1000000000, 'SUI');
      
      // Create transaction
      const tx = transactionExecutor.createPrivateMockEventTransaction(
        1000000000, // 1 SUI per participant
        1000000000  // 1 SUI for pending request
      );
      
      
      // Execute the transaction and return a promise that resolves with the result
      return new Promise((resolve, reject) => {
        console.log('🚀 Calling signAndExecuteTransaction...');
        signAndExecuteTransaction({
          transaction: tx,
        }, {
          onSuccess: (result) => {
            console.log('✅ Create private mock event transaction result:', result);
            console.log('🔍 Result effects:', result.effects);
            console.log('🔍 Result digest:', result.digest);
            
            // Extract event ID from the transaction result
            let eventId = 'pending';
            console.log('🔍 Extracting event ID from result:', result);
            
            if (result.effects && typeof result.effects === 'object' && 'created' in result.effects) {
              const createdObjects = (result.effects as Record<string, unknown>).created;
              console.log('🔍 Created objects:', createdObjects);
              
              if (Array.isArray(createdObjects)) {
                for (const obj of createdObjects) {
                  console.log('🔍 Checking object:', obj);
                  if (obj && typeof obj === 'object' && 'reference' in obj) {
                    const ref = (obj as { reference: { objectId?: string } }).reference;
                    if (ref && ref.objectId) {
                      eventId = ref.objectId;
                      console.log('✅ Found event ID:', eventId);
                      break;
                    }
                  }
                }
              }
            }
            
            // If we still don't have a valid event ID, try to get it from objectChanges
            if (eventId === 'pending' && result.objectChanges) {
              console.log('🔍 Trying objectChanges:', result.objectChanges);
              const objectChanges = result.objectChanges as Array<{ type: string; objectId?: string; objectType?: string }>;
              for (const change of objectChanges) {
                if (change.type === 'created' && change.objectType && change.objectType.includes('Event')) {
                  eventId = change.objectId || 'pending';
                  console.log('✅ Found event ID from objectChanges:', eventId);
                  break;
                }
              }
            }
            
            console.log('🎉 Private mock event created successfully! Event ID:', eventId);
            resolve({
              eventId,
              transactionId: result.digest,
              message: 'Private mock event created successfully!',
            });
          },
          onError: (error) => {
            console.error('❌ Create private mock event transaction failed:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            reject(error);
          }
        });
      });
    } catch (err) {
      console.error('💥 Create private mock event error:', err);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError, suiClient, getUserSUICoins]);

  return {
    // State
    loading,
    error,
    
    // Actions
    createEvent,
    createFundedMockEvent, // NEW
    createPrivateMockEvent, // NEW
    joinEvent,
    requestToJoin, // NEW
    acceptRequests, // NEW
    rejectRequests, // NEW
    withdrawFromEvent, // NEW
    claimPendingStake, // NEW
    markAttendance,
    claim,
    refund,
    cancelEvent,
    getEvent,
    getUserSUICoins,
    getAllEvents,
    getAllEventsGlobal,
    refreshGlobalEvents,
    
    // Network Events
    queryNetworkEvents: (eventType?: string, limit?: number) => queryNetworkEvents(suiClient, PACKAGE_ID, eventType, limit),
    getEventCreatedEvents: (limit?: number) => queryNetworkEvents(suiClient, PACKAGE_ID, EVENT_TYPES.EVENT_CREATED, limit),
    getEventJoinedEvents: (limit?: number) => queryNetworkEvents(suiClient, PACKAGE_ID, EVENT_TYPES.EVENT_JOINED, limit),
    getEventRequestedEvents: (limit?: number) => queryNetworkEvents(suiClient, PACKAGE_ID, EVENT_TYPES.EVENT_REQUESTED, limit),
    getEventAttendedEvents: (limit?: number) => queryNetworkEvents(suiClient, PACKAGE_ID, EVENT_TYPES.EVENT_ATTENDED, limit),
    getEventClaimedEvents: (limit?: number) => queryNetworkEvents(suiClient, PACKAGE_ID, EVENT_TYPES.EVENT_CLAIMED, limit),
    
    // Batch operations for organizer dashboard
    
    // Utils
    clearError,
  };
}
