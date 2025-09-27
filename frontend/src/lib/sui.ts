import { createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

export const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Contract configuration
export const CONTRACT_ADDRESS = '0x530bd0b9fdb306539eb14b86806784069d3a196aa0db65b63bd46d8c20168e95';
export const PACKAGE_ID = '0x530bd0b9fdb306539eb14b86806784069d3a196aa0db65b63bd46d8c20168e95';

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
  registrationStartTime: string;  // NEW: When registration opens
  registrationEndTime: string;    // NEW: When registration closes
  endTime: string;
  stakeAmount: string;
  capacity: string;
  organizer: string;
  mustRequestToJoin: boolean;  // NEW: Public vs private event
  participants: string[];
  pendingRequests: string[];   // NEW: Pending requests for private events
  attendees: string[];
  claimed: string[];
  participantVault: string;    // NEW: Vault for confirmed participants
  pendingVault: string;        // NEW: Vault for pending requests
  totalPot: string;            // NEW: Total pot for fair splitting
}

// Utility functions for querying events
export const getEventType = (packageId: string) => 
  `${packageId}::showup::Event`;

// Event types for network events
export const EVENT_TYPES = {
  EVENT_CREATED: 'EventCreated',
  EVENT_JOINED: 'EventJoined',
  EVENT_REQUESTED: 'EventRequested',
  EVENT_REQUEST_ACCEPTED: 'EventRequestAccepted',
  EVENT_REQUEST_REJECTED: 'EventRequestRejected',
  EVENT_WITHDRAWN: 'EventWithdrawn',
  EVENT_ATTENDED: 'EventAttended',
  EVENT_CLAIMED: 'EventClaimed',
  EVENT_REFUNDED: 'EventRefunded',
  EVENT_CANCELLED: 'EventCancelled',
  PENDING_STAKE_CLAIMED: 'PendingStakeClaimed',
} as const;

// Types for Sui client methods
interface SuiClientQueryEvents {
  queryEvents: (params: {
    query: {
      MoveEventType?: string;
      MoveEventModule?: {
        module: string;
        package: string;
      };
    };
    limit: number;
    order: string;
  }) => Promise<{ data: unknown[] }>;
}

interface SuiClientParticipantCheck {
  getObject: (params: { id: string; options: { showContent: boolean; showType: boolean } }) => Promise<unknown>;
  queryTransactionBlocks: (params: {
    filter: {
      FromAddress: string;
      MoveFunction: {
        package: string;
        module: string;
        function: string;
      };
    };
    options: {
      showEffects: boolean;
      showObjectChanges: boolean;
    };
    limit: number;
    order: string;
  }) => Promise<{ data: unknown[] }>;
  getDynamicFieldObject: (params: {
    parentId: string;
    name: {
      type: string;
      value: string;
    };
  }) => Promise<{ data?: unknown }>;
}

// Function to query network events
export const queryNetworkEvents = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiClient: any,
  packageId: string,
  eventType?: string,
  limit: number = 50
) => {
  try {
    console.log('🔍 Querying network events:', { eventType, limit });
    
    const query = eventType 
      ? {
          MoveEventType: `${packageId}::showup::${eventType}`,
        }
      : {
          MoveEventModule: {
            module: 'showup',
            package: packageId,
          },
        };

    const events = await suiClient.queryEvents({
      query,
      limit,
      order: 'descending',
    });

    console.log('✅ Found events:', events.data.length);
    return events.data;
  } catch (error) {
    console.error('❌ Error querying network events:', error);
    return [];
  }
};

// Function to check if a user is a participant by querying the VecMap
export const isUserParticipant = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiClient: any, 
  eventId: string, 
  userAddress: string
): Promise<boolean> => {
  try {
    console.log('🔍 Checking if user is participant:', userAddress, 'in event:', eventId);
    console.log('🔍 SuiClient type:', typeof suiClient, 'value:', suiClient);
    
    // Check if suiClient is available
    if (!suiClient || typeof suiClient !== 'object') {
      console.error('❌ SuiClient is not available or invalid:', suiClient);
      return false;
    }
    
    // Query the event object to get the participants VecMap
    const eventData = await suiClient.getObject({
      id: eventId,
      options: { showContent: true, showType: true }
    }) as { data?: { content?: { fields?: Record<string, unknown> } } };

    if (!eventData.data?.content || !('fields' in eventData.data.content)) {
      return false;
    }

    const fields = eventData.data.content.fields as Record<string, unknown>;
    const participantsVecMap = fields.participants;
    
    if (!participantsVecMap || typeof participantsVecMap !== 'object' || !('fields' in participantsVecMap)) {
      return false;
    }

    const vecMapFields = (participantsVecMap as { fields: { contents: Array<{ fields: { key: string; value: boolean } }> } }).fields;
    const contents = vecMapFields.contents;
    
    // Check if the VecMap has entries by looking at the contents length
    const size = contents.length;
    console.log('📊 Participants VecMap size:', size);
    
    if (size === 0) {
      return false;
    }

    // Search through the contents array for the user's address
    for (const entry of contents) {
      if (entry.fields.key === userAddress) {
        console.log('✅ User found in participants VecMap');
        return true;
      }
    }
    
    console.log('🔍 User not found in participants VecMap');
    
    // Skip fallback query to avoid suiClient issues
    // The VecMap check above should be sufficient for most cases
    console.log('🔍 Skipping fallback query to avoid suiClient issues');
    return false;
  } catch (error) {
    console.error('❌ Error checking participant status:', error);
    return false;
  }
};

export const parseEventFromObject = (object: Record<string, unknown>): EventObject => {
  console.log('🔍 Parsing event object:', object);
  
  const fields = (object as { content?: { fields?: Record<string, unknown> } }).content?.fields;
  if (!fields) {
    console.error('❌ Invalid event object: missing fields', object);
    throw new Error('Invalid event object: missing fields');
  }

  console.log('📋 Event fields:', fields);

  // Extract VecMap sizes for participant counts
  const participantsVecMap = fields.participants as { fields?: { contents?: Array<{ fields: { key: string; value: boolean } }> } } | undefined;
  const pendingRequestsVecMap = fields.pending_requests as { fields?: { contents?: Array<{ fields: { key: string; value: boolean } }> } } | undefined;
  const attendeesVecMap = fields.attendees as { fields?: { contents?: Array<{ fields: { key: string; value: boolean } }> } } | undefined;
  const claimedVecMap = fields.claimed as { fields?: { contents?: Array<{ fields: { key: string; value: boolean } }> } } | undefined;

  const parsedEvent = {
    id: String(object.objectId || ''),
    name: String(fields.name || ''),
    description: String(fields.description || ''),
    location: String(fields.location || ''),
    startTime: String(fields.start_time || '0'),
    registrationStartTime: String(fields.registration_start_time || '0'),  // NEW
    registrationEndTime: String(fields.registration_end_time || '0'),      // NEW
    endTime: String(fields.end_time || '0'),
    stakeAmount: String(fields.stake_amount || '0'),
    capacity: String(fields.capacity || '0'),
    organizer: String(fields.organizer || ''),
    mustRequestToJoin: Boolean(fields.must_request_to_join || false),  // NEW
    participants: participantsVecMap?.fields?.contents?.map(entry => entry.fields.key) || [], // Extract keys from VecMap
    pendingRequests: pendingRequestsVecMap?.fields?.contents?.map(entry => entry.fields.key) || [],  // Extract keys from VecMap
    attendees: attendeesVecMap?.fields?.contents?.map(entry => entry.fields.key) || [],    // Extract keys from VecMap
    claimed: claimedVecMap?.fields?.contents?.map(entry => entry.fields.key) || [],      // Extract keys from VecMap
    participantVault: String(fields.participant_vault || '0'),  // NEW
    pendingVault: String(fields.pending_vault || '0'),          // NEW
    totalPot: String(fields.total_pot || '0'),                  // NEW
  };

  console.log('✅ Parsed event:', parsedEvent);
  return parsedEvent;
};
