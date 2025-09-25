'use client';

import { useCurrentAccount, useWallets, useConnectWallet, useDisconnectWallet } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function WalletButton() {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (wallets.length === 0) {
      alert('No wallets found. Please install a Sui wallet like Mysten or Ethos.');
      return;
    }

    setIsConnecting(true);
    try {
      connect({ wallet: wallets[0] });
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (account) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">
          Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </div>
        <Button 
          onClick={handleDisconnect}
          variant="outline"
          size="sm"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button 
        onClick={handleConnect}
        disabled={isConnecting || wallets.length === 0}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {wallets.length === 0 && (
        <p className="text-xs text-gray-500 text-center">
          Install Mysten or Ethos wallet to continue
        </p>
      )}
    </div>
  );
}
