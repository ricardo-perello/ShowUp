import { createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

export const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Contract configuration
export const CONTRACT_ADDRESS = '0xfc0a9067f6227065f476d0b10557801080054f6f633f2036abc8c47e6d77fa36';
export const PACKAGE_ID = '0xfc0a9067f6227065f476d0b10557801080054f6f633f2036abc8c47e6d77fa36';

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

// Function to check if a user is a participant by querying the table
export const isUserParticipant = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiClient: any, 
  eventId: string, 
  userAddress: string
): Promise<boolean> => {
  try {
    console.log('🔍 Checking if user is participant:', userAddress, 'in event:', eventId);
    
    // Query the event object to get the participants table
    const eventData = await suiClient.getObject({
      id: eventId,
      options: { showContent: true, showType: true }
    }) as { data?: { content?: { fields?: Record<string, unknown> } } };

    if (!eventData.data?.content || !('fields' in eventData.data.content)) {
      return false;
    }

    const fields = eventData.data.content.fields as Record<string, unknown>;
    const participantsTable = fields.participants;
    
    if (!participantsTable || typeof participantsTable !== 'object' || !('fields' in participantsTable)) {
      return false;
    }

    const tableFields = (participantsTable as { fields: Record<string, unknown> }).fields;
    const tableId = tableFields.id;
    
    // Check if the table has entries by looking at the size
    const size = parseInt(String(tableFields.size || '0'));
    console.log('📊 Participants table size:', size, 'table ID:', tableId);
    
    if (size === 0) {
      return false;
    }

    // Try to get the specific table entry for this user
    try {
      const tableEntry = await suiClient.getDynamicFieldObject({
        parentId: String(tableId),
        name: {
          type: 'address',
          value: userAddress,
        },
      });
      
      console.log('🔍 Table entry for user:', tableEntry);
      
      // If we get a result, the user is in the table
      if (tableEntry.data) {
        console.log('✅ User found in participants table');
        return true;
      }
    } catch {
      console.log('🔍 User not found in participants table (this is normal if not a participant)');
    }

    // Fallback: check transaction history
    const recentTxs = await suiClient.queryTransactionBlocks({
      filter: {
        FromAddress: userAddress,
        MoveFunction: {
          package: PACKAGE_ID,
          module: 'showup',
          function: 'join_event',
        },
      },
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
      limit: 20,
      order: 'descending',
    });

    console.log('🔍 Found', recentTxs.data.length, 'join_event transactions from user');

    // Check if any of the recent join_event transactions involved this specific event
    for (const tx of recentTxs.data) {
      console.log('🔍 Checking transaction:', tx.digest);
      if (tx.objectChanges) {
        for (const change of tx.objectChanges) {
          console.log('🔍 Object change:', change.type, change.objectId);
          if (change.type === 'mutated' && change.objectId === eventId) {
            console.log('✅ Found join_event transaction for user in this event');
            return true;
          }
        }
      }
    }

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

  // Extract table sizes for participant counts
  const participantsTable = fields.participants as { fields?: { size?: string } } | undefined;
  const pendingRequestsTable = fields.pending_requests as { fields?: { size?: string } } | undefined;
  const attendeesTable = fields.attendees as { fields?: { size?: string } } | undefined;
  const claimedTable = fields.claimed as { fields?: { size?: string } } | undefined;

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
    participants: Array(parseInt(participantsTable?.fields?.size || '0')).fill(''), // Create array with correct size
    pendingRequests: Array(parseInt(pendingRequestsTable?.fields?.size || '0')).fill(''),  // Create array with correct size
    attendees: Array(parseInt(attendeesTable?.fields?.size || '0')).fill(''),    // Create array with correct size
    claimed: Array(parseInt(claimedTable?.fields?.size || '0')).fill(''),      // Create array with correct size
    participantVault: String(fields.participant_vault || '0'),  // NEW
    pendingVault: String(fields.pending_vault || '0'),          // NEW
    totalPot: String(fields.total_pot || '0'),                  // NEW
  };

  console.log('✅ Parsed event:', parsedEvent);
  return parsedEvent;
};
