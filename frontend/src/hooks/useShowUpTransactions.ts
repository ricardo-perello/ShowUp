import { useState, useCallback } from 'react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { transactionExecutor } from '@/lib/transactionExecutor';
import { PACKAGE_ID, getEventType, parseEventFromObject, EventObject } from '@/lib/sui';

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
    durationHours: number;
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

      const startTime = transactionExecutor.getCurrentEpoch();
      const endTime = transactionExecutor.createEndTime(params.durationHours);
      
      console.log('⏰ Event timing:', { startTime, endTime, durationHours: params.durationHours });

      const tx = transactionExecutor.createEventTransaction({
        name: params.name,
        description: params.description,
        location: params.location,
        startTime,
        endTime,
        stakeAmount: params.stakeAmount,
        capacity: params.capacity,
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
            if (result.effects && typeof result.effects === 'object' && 'created' in result.effects) {
              // Find the Event object in created objects
              const createdObjects = (result.effects as any).created;
              if (Array.isArray(createdObjects)) {
                for (const obj of createdObjects) {
                  if (obj.reference && obj.reference.objectId) {
                    // This is likely the Event object
                    eventId = obj.reference.objectId;
                    break;
                  }
                }
              }
            }
            
            console.log('🎉 Event created with ID:', eventId);
            resolve({
              eventId,
              transactionId: result.digest || 'pending',
              startTime,
              endTime,
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

  // Join event
  const joinEvent = useCallback(async (eventId: string, stakeCoinId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.joinEventTransaction(eventId, stakeCoinId);

      // Execute the transaction
      signAndExecuteTransaction({
        transaction: tx,
      });

      return {
        transactionId: 'pending',
        message: 'Transaction submitted! Check your wallet for confirmation.',
      };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // Mark attendance
  const markAttendance = useCallback(async (eventId: string, participantAddress: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.markAttendedTransaction(eventId, participantAddress);

      // Execute the transaction
      signAndExecuteTransaction({
        transaction: tx,
      });

      return {
        transactionId: 'pending',
        message: 'Transaction submitted! Check your wallet for confirmation.',
      };
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
      const tx = transactionExecutor.claimTransaction(eventId);

      // Execute the transaction
      signAndExecuteTransaction({
        transaction: tx,
      });

      return {
        transactionId: 'pending',
        message: 'Transaction submitted! Check your wallet for confirmation.',
      };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // Refund
  const refund = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.refundTransaction(eventId);

      // Execute the transaction
      signAndExecuteTransaction({
        transaction: tx,
      });

      return {
        transactionId: 'pending',
        message: 'Transaction submitted! Check your wallet for confirmation.',
      };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, signAndExecuteTransaction, handleError]);

  // Cancel event
  const cancelEvent = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = transactionExecutor.cancelEventTransaction(eventId);

      // Execute the transaction
      signAndExecuteTransaction({
        transaction: tx,
      });

      return {
        transactionId: 'pending',
        message: 'Transaction submitted! Check your wallet for confirmation.',
      };
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
            const event = parseEventFromObject(item.data);
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

  // Get all events (not just owned by user) - query all Event objects
  const getAllEventsGlobal = useCallback(async (): Promise<EventObject[]> => {
    try {
      console.log('🔍 Getting all events globally...');
      const eventType = getEventType(PACKAGE_ID);
      console.log('📦 Event type:', eventType);
      
      // For now, we'll use a simple approach: get events from the current user
      // In a production app, you'd want to use an indexer or query multiple addresses
      const userEvents = await getAllEvents();
      console.log('👤 User events found:', userEvents.length);
      
      // Log the events for debugging
      userEvents.forEach((event, index) => {
        console.log(`📅 Event ${index + 1}:`, {
          id: event.id,
          name: event.name,
          organizer: event.organizer
        });
      });
      
      return userEvents;
    } catch (err) {
      console.error('❌ Error getting all events:', err);
      handleError(err);
      return [];
    }
  }, [suiClient, handleError, getAllEvents]);

  return {
    // State
    loading,
    error,
    
    // Actions
    createEvent,
    joinEvent,
    markAttendance,
    claim,
    refund,
    cancelEvent,
    getEvent,
    getUserSUICoins,
    getAllEvents,
    getAllEventsGlobal,
    
    // Utils
    clearError,
  };
}
