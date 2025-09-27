import { useState, useCallback } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { showUpContract, getErrorMessage } from '@/lib/simpleContract';

export function useSimpleShowUp() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  
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
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = showUpContract.createEndTime(params.durationHours);

      const transactionData = showUpContract.createEventTransaction({
        name: params.name,
        description: params.description,
        location: params.location,
        startTime,
        endTime,
        stakeAmount: params.stakeAmount,
        capacity: params.capacity,
      });

      // Return the transaction data for the frontend to handle
      return {
        transactionData,
        startTime,
        endTime,
      };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, handleError]);

  // Join event
  const joinEvent = useCallback(async (eventId: string, stakeCoinId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const transactionData = showUpContract.joinEventTransaction(eventId, stakeCoinId);
      return { transactionData };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, handleError]);

  // Mark attendance
  const markAttendance = useCallback(async (eventId: string, participantAddress: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const transactionData = showUpContract.markAttendedTransaction(eventId, participantAddress);
      return { transactionData };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, handleError]);

  // Claim rewards
  const claim = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const transactionData = showUpContract.claimTransaction(eventId);
      return { transactionData };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, handleError]);

  // Refund
  const refund = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const transactionData = showUpContract.refundTransaction(eventId);
      return { transactionData };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, handleError]);

  // Cancel event
  const cancelEvent = useCallback(async (eventId: string) => {
    if (!account) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const transactionData = showUpContract.cancelEventTransaction(eventId);
      return { transactionData };
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, handleError]);

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
    
    // Utils
    clearError,
  };
}
