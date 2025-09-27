import { createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

export const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Contract configuration
export const CONTRACT_ADDRESS = '0x9cc2ce04c65bc552f2daaf278ac9f4f1839d55c376b27584efa736c8f587abfc';
export const PACKAGE_ID = '0x9cc2ce04c65bc552f2daaf278ac9f4f1839d55c376b27584efa736c8f587abfc';

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
  registrationEndTime: string;  // NEW: Registration deadline
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

// Function to check if a user is a participant by querying the table
export const isUserParticipant = async (
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
    });

    if (!eventData.data?.content || !('fields' in eventData.data.content)) {
      return false;
    }

    const fields = eventData.data.content.fields as Record<string, unknown>;
    const participantsTable = fields.participants;
    
    if (!participantsTable || typeof participantsTable !== 'object' || !('fields' in participantsTable)) {
      return false;
    }

    const tableFields = (participantsTable as any).fields;
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
        parentId: eventId,
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
    } catch (tableError) {
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

  const parsedEvent = {
    id: String(object.objectId || ''),
    name: String(fields.name || ''),
    description: String(fields.description || ''),
    location: String(fields.location || ''),
    startTime: String(fields.start_time || '0'),
    registrationEndTime: String(fields.registration_end_time || '0'),  // NEW
    endTime: String(fields.end_time || '0'),
    stakeAmount: String(fields.stake_amount || '0'),
    capacity: String(fields.capacity || '0'),
    organizer: String(fields.organizer || ''),
    mustRequestToJoin: Boolean(fields.must_request_to_join || false),  // NEW
    participants: [], // Tables need special handling - will be populated by isUserParticipant
    pendingRequests: [],  // Tables need special handling
    attendees: [],    // Tables need special handling
    claimed: [],      // Tables need special handling
    participantVault: String(fields.participant_vault || '0'),  // NEW
    pendingVault: String(fields.pending_vault || '0'),          // NEW
    totalPot: String(fields.total_pot || '0'),                  // NEW
  };

  console.log('✅ Parsed event:', parsedEvent);
  return parsedEvent;
};
