import { createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

export const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Contract configuration
export const CONTRACT_ADDRESS = '0xcfa197d066b4982c14fde0ba7379ad3bb018f820da4cd161b966cac1019a1f66';
export const PACKAGE_ID = '0xcfa197d066b4982c14fde0ba7379ad3bb018f820da4cd161b966cac1019a1f66';

// Event object type
export interface Event {
  id: string;
  organizer: string;
  stakeAmount: string;
  endTime: string;
  participants: string[];
  attendees: string[];
  vault: string;
}

// QR Code payload type
export interface QRPayload {
  event_id: string;
  address: string;
}
