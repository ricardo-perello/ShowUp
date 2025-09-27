import { createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

export const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Contract configuration
export const CONTRACT_ADDRESS = '0x8f0a4be503273ead1bee02dbc1179efaa880c41cbf7065eec64128d82301cec6';
export const PACKAGE_ID = '0x8f0a4be503273ead1bee02dbc1179efaa880c41cbf7065eec64128d82301cec6';

// Event object type
export interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  stakeAmount: string;
  capacity: string;
  organizer: string;
  participants: string[];
  attendees: string[];
  claimed: string[];
  vault: string;
}

// QR Code payload type
export interface QRPayload {
  event_id: string;
  address: string;
}

// Event object type from blockchain
export interface EventObject {
  id: string;
  name: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  stakeAmount: string;
  capacity: string;
  organizer: string;
  participants: string[];
  attendees: string[];
  claimed: string[];
  vault: string;
}

// Utility functions for querying events
export const getEventType = (packageId: string) => 
  `${packageId}::showup::Event`;

export const parseEventFromObject = (object: any): EventObject => {
  console.log('🔍 Parsing event object:', object);
  
  const fields = object.content?.fields;
  if (!fields) {
    console.error('❌ Invalid event object: missing fields', object);
    throw new Error('Invalid event object: missing fields');
  }

  console.log('📋 Event fields:', fields);

  const parsedEvent = {
    id: object.objectId,
    name: fields.name || '',
    description: fields.description || '',
    location: fields.location || '',
    startTime: fields.start_time || '0',
    endTime: fields.end_time || '0',
    stakeAmount: fields.stake_amount || '0',
    capacity: fields.capacity || '0',
    organizer: fields.organizer || '',
    participants: [], // Tables need special handling
    attendees: [],    // Tables need special handling
    claimed: [],      // Tables need special handling
    vault: fields.vault || '0',
  };

  console.log('✅ Parsed event:', parsedEvent);
  return parsedEvent;
};
