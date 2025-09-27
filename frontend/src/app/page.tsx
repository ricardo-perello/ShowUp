'use client';

import { useCurrentAccount } from '@mysten/dapp-kit';
import { WalletButton } from '@/components/WalletButton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, Users, QrCode, Wallet } from 'lucide-react';

export default function Home() {
  const account = useCurrentAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">ShowUp</h1>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Web3 Event Reservations
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Decentralized event reservations and attendance protocol on Sui. 
            Stake tokens to join events, scan QR codes for attendance, and claim rewards.
          </p>

          {!account ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <p className="text-yellow-800 mb-4">
                Please connect your wallet to get started
              </p>
              <WalletButton />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Organizer Card */}
              <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-transparent hover:border-blue-200 transition-colors">
                <div className="text-center">
                  <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Organizer</h2>
                  <p className="text-gray-600 mb-6">
                    Create events, manage participants, and scan QR codes to mark attendance.
                  </p>
                  <div className="space-y-3">
                    <Link href="/create">
                      <Button className="w-full">
                        Create Event
                      </Button>
                    </Link>
                    <Link href="/my-events">
                      <Button variant="outline" className="w-full">
                        My Events
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Participant Card */}
              <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-transparent hover:border-green-200 transition-colors">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Participant</h2>
                  <p className="text-gray-600 mb-6">
                    Join events by staking tokens, get QR codes, and claim rewards after attending.
                  </p>
                  <div className="space-y-3">
                    <Link href="/events">
                      <Button className="w-full">
                        Browse Events
                      </Button>
                    </Link>
                    <Link href="/my-participations">
                      <Button variant="outline" className="w-full">
                        My Participations
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">How it Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Stake & Join</h3>
                <p className="text-gray-600">
                  Participants stake tokens to join events and receive QR codes
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <QrCode className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Attend Event</h3>
                <p className="text-gray-600">
                  Organizers scan QR codes to mark attendance at the event
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Claim Rewards</h3>
                <p className="text-gray-600">
                  Attendees claim their stake plus a share of no-show penalties
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}