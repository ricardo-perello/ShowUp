'use client';

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Coins, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';
import { QRCodeSVG } from 'qrcode.react';

export default function SimpleEventDetailsPage() {
  const account = useCurrentAccount();
  const params = useParams();
  const eventId = params.id as string;
  
  const { joinEvent, claim, refund, loading } = useShowUpTransactions();
  const [isJoining, setIsJoining] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleJoin = async () => {
    if (!account) return;

    setIsJoining(true);
    try {
      const result = await joinEvent(eventId);
      alert(`Successfully joined event! Transaction: ${(result as unknown as { transactionId?: string })?.transactionId || 'pending'}`);
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
      alert(`Successfully claimed rewards! Transaction: ${result.transactionId}`);
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
      alert(`Successfully refunded! Transaction: ${result.transactionId}`);
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
              <h1 className="text-2xl font-bold text-gray-900">Event Details</h1>
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
                  <p className="text-sm font-medium text-gray-500">Event ID</p>
                  <p className="text-gray-900 font-mono text-sm">{eventId}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Users className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-gray-900">Ready for testing</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <Button 
                onClick={handleJoin} 
                disabled={isJoining || loading}
                className="w-full"
              >
                {isJoining ? 'Joining...' : 'Join Event (Test)'}
              </Button>

              <Button 
                onClick={handleClaim} 
                disabled={isClaiming || loading}
                className="w-full"
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards (Test)'}
              </Button>

              <Button 
                onClick={handleRefund} 
                disabled={isRefunding || loading}
                className="w-full"
              >
                {isRefunding ? 'Refunding...' : 'Get Refund (Test)'}
              </Button>
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
              <h3 className="text-sm font-medium text-blue-900 mb-2">Test Instructions</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• This is a test page for the ShowUp integration</p>
                <p>• All transactions will be submitted to your wallet</p>
                <p>• Check your wallet for transaction confirmations</p>
                <p>• Use the test page for full functionality testing</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

