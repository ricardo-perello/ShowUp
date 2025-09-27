'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';

export function DebugInfo() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [balance, setBalance] = useState<string>('Loading...');
  const [network, setNetwork] = useState<string>('Loading...');

  useEffect(() => {
    const fetchInfo = async () => {
      if (account && suiClient) {
        try {
          // Get balance
          const coins = await suiClient.getCoins({
            owner: account.address,
            coinType: '0x2::sui::SUI',
          });
          
          const totalBalance = coins.data.reduce((sum, coin) => sum + parseInt(coin.balance), 0);
          setBalance((totalBalance / 1_000_000_000).toFixed(4) + ' SUI');

          // Get network info
          const chainId = await suiClient.getChainIdentifier();
          setNetwork(chainId);
        } catch (error) {
          console.error('Error fetching debug info:', error);
          setBalance('Error');
          setNetwork('Error');
        }
      }
    };

    fetchInfo();
  }, [account, suiClient]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono">
      <div>Wallet: {account ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 'Not connected'}</div>
      <div>Balance: {balance}</div>
      <div>Network: {network}</div>
    </div>
  );
}
