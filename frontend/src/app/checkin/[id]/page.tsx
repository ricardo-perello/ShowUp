'use client';

import { useState, useRef, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/WalletButton';
import { ArrowLeft, QrCode, CheckCircle, X, Users, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useShowUpTransactions } from '@/hooks/useShowUpTransactions';

export default function CheckinPage() {
  const account = useCurrentAccount();
  const params = useParams();
  const eventId = params.id as string;
  
  const { markAttendance, loading, error } = useShowUpTransactions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // For now, assume user is organizer (in real app, check from event data)
  const isOrganizer = true;

  const startScanning = () => {
    setIsScanning(true);
  };

  // Use useEffect to initialize scanner when isScanning becomes true
  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        const qrReaderElement = document.getElementById("qr-reader");
        if (!qrReaderElement) {
          console.error("QR reader element not found");
          setIsScanning(false);
          return;
        }

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            qrbox: { width: 250, height: 250 },
            fps: 5,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            try {
              const qrPayload = JSON.parse(decodedText);
              
              if (qrPayload.event_id === eventId) {
                setLastScanned(qrPayload.address);
                if (!scannedCodes.includes(qrPayload.address)) {
                  handleMarkAttendance(qrPayload.address);
                }
              } else {
                alert('This QR code is for a different event');
              }
            } catch {
              alert('Invalid QR code format');
            }
          },
          () => {
            // Ignore scanning errors
          }
        );

        scannerRef.current = scanner;
      }, 100); // Small delay to ensure DOM is updated

      return () => clearTimeout(timer);
    }
  }, [isScanning, eventId, scannedCodes]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleMarkAttendance = async (participantAddress: string) => {
    if (markingAttendance === participantAddress) return; // Prevent double calls
    
    setMarkingAttendance(participantAddress);
    try {
      const result = await markAttendance(eventId, participantAddress);
      
      // Attendance marked successfully!
      console.log('Attendance marked:', result);
      alert(`Attendance marked successfully! Transaction: ${result.transactionId}`);
      
      // Add to scanned codes
      setScannedCodes(prev => [...prev, participantAddress]);
      
      // Show success
      setTimeout(() => {
        setLastScanned(null);
        setMarkingAttendance(null);
      }, 2000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert(`Failed to mark attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMarkingAttendance(null);
    }
  };

  const clearScanned = () => {
    setScannedCodes([]);
    setLastScanned(null);
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to scan QR codes</p>
          <WalletButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Event</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/events">
            <Button>Back to Events</Button>
          </Link>
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

  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only the event organizer can scan QR codes</p>
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
              <Link href={`/events/${eventId}`} className="mr-4">
                <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
              </Link>
              <QrCode className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Check-in Scanner</h1>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Scanner */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">QR Code Scanner</h2>
            
            {!isScanning ? (
              <div className="text-center py-12">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-6">Start scanning to mark attendance</p>
                <Button onClick={startScanning} className="w-full">
                  Start Scanning
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div id="qr-reader" className="w-full"></div>
                <Button onClick={stopScanning} variant="outline" className="w-full">
                  Stop Scanning
                </Button>
              </div>
            )}

            {lastScanned && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">
                    Marked attendance for {formatAddress(lastScanned)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Scanned List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Attendees</h2>
              {scannedCodes.length > 0 && (
                <Button onClick={clearScanned} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            
            {scannedCodes.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No attendees marked yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scannedCodes.map((address, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-green-50 border border-green-200 rounded">
                    <span className="font-mono text-sm">{formatAddress(address)}</span>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Event ID:</span>
                  <span className="font-medium font-mono text-xs">{eventId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Attendees:</span>
                  <span className="font-medium">{scannedCodes.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Participants will show you their QR codes</li>
                <li>• Point the camera at the QR code</li>
                <li>• Attendance will be marked automatically</li>
                <li>• Green checkmarks confirm successful scans</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
