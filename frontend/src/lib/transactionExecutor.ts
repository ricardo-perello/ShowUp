import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID } from './sui';

// Transaction executor that works with dapp-kit
export class TransactionExecutor {
  constructor(private packageId: string) {}

  // Create event transaction
  createEventTransaction(params: {
    name: string;
    description: string;
    location: string;
    startTime: number;
    registrationStartTime: number; // NEW: When registration opens
    registrationEndTime: number;   // NEW: When registration closes
    endTime: number;
    stakeAmount: number; // in SUI
    capacity: number;
    mustRequestToJoin: boolean; // NEW
  }) {
    console.log('🔧 Creating event transaction with params:', params);
    console.log('📦 Package ID:', this.packageId);
    
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::create_event`,
      arguments: [
        tx.pure.string(params.name),
        tx.pure.string(params.description),
        tx.pure.string(params.location),
        tx.pure.u64(params.startTime),
        tx.pure.u64(params.registrationStartTime), // NEW: When registration opens
        tx.pure.u64(params.registrationEndTime),   // NEW: When registration closes
        tx.pure.u64(params.endTime),
        tx.pure.u64(Math.floor(params.stakeAmount * 1_000_000_000)), // Convert to MIST
        tx.pure.u64(params.capacity),
        tx.pure.bool(params.mustRequestToJoin), // NEW
      ],
    });

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST
    console.log('⛽ Gas budget set to:', 100000000, 'MIST (0.1 SUI)');

    return tx;
  }

  // Join event transaction
  joinEventTransaction(eventId: string, stakeCoinId: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::join_event`,
      arguments: [
        tx.object(eventId),
        tx.object(stakeCoinId),
        tx.object('0x6'), // Clock object at address 0x6
      ],
    });

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST

    return tx;
  }

  // Mark attendance transaction (updated to handle multiple participants)
  markAttendedTransaction(eventId: string, participants: string[]) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::mark_attended`,
      arguments: [
        tx.object(eventId),
        tx.pure.vector('address', participants),
      ],
    });

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST

    return tx;
  }

  // Claim transaction
  claimTransaction(eventId: string, sender: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::claim_entry`,
      arguments: [
        tx.object(eventId),
        tx.object('0x6'), // Clock object at address 0x6
      ],
    });

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST

    return tx;
  }

  // Refund transaction
  refundTransaction(eventId: string, sender: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::refund_entry`,
      arguments: [
        tx.object(eventId),
        tx.object('0x6'), // Clock object at address 0x6
      ],
    });

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST

    return tx;
  }

  // Cancel event transaction
  cancelEventTransaction(eventId: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::cancel_event`,
      arguments: [
        tx.object(eventId),
        tx.object('0x6'), // Clock object at address 0x6
      ],
    });

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST

    return tx;
  }

  // Helper function to convert SUI to MIST
  suiToMist(sui: number): number {
    return Math.floor(sui * 1_000_000_000);
  }

  // Helper function to convert MIST to SUI
  mistToSui(mist: number): number {
    return mist / 1_000_000_000;
  }

  // Helper function to get current epoch
  getCurrentEpoch(): number {
    // Return current Unix timestamp (seconds since epoch)
    return Math.floor(Date.now() / 1000);
  }

  // Helper function to convert Unix timestamp to Sui epoch
  unixToSuiEpoch(unixTimestamp: number): number {
    // The contract now uses Unix timestamps directly (in seconds)
    // No conversion needed - just return the Unix timestamp
    return unixTimestamp;
  }

  // Helper function to convert Sui epoch to Unix timestamp
  suiEpochToUnix(epoch: number): number {
    // The contract now stores Unix timestamps directly
    // No conversion needed - just return the epoch
    return epoch;
  }

  // Helper function to get current Sui epoch from network
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCurrentSuiEpoch(suiClient: any): Promise<number> {
    try {
      // Return current Unix timestamp (seconds since epoch)
      return Math.floor(Date.now() / 1000);
    } catch (error) {
      console.warn('Failed to get current Sui epoch, using approximation:', error);
      return this.getCurrentEpoch();
    }
  }

  // Helper function to create event end time
  createEndTime(hoursFromNow: number): number {
    return this.getCurrentEpoch() + (hoursFromNow * 3600);
  }

  // NEW: Request to join private event transaction
  requestToJoinTransaction(eventId: string, stakeCoinId: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::request_to_join`,
      arguments: [
        tx.object(eventId),
        tx.object(stakeCoinId),
        tx.object('0x6'), // Clock object at address 0x6
      ],
    });

    tx.setGasBudget(100000000);
    return tx;
  }

  // NEW: Accept requests transaction (organizer only)
  acceptRequestsTransaction(eventId: string, participants: string[]) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::accept_requests`,
      arguments: [
        tx.object(eventId),
        tx.pure.vector('address', participants),
      ],
    });

    tx.setGasBudget(100000000);
    return tx;
  }

  // NEW: Reject requests transaction (organizer only)
  rejectRequestsTransaction(eventId: string, participants: string[]) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::reject_requests`,
      arguments: [
        tx.object(eventId),
        tx.pure.vector('address', participants),
      ],
    });

    tx.setGasBudget(100000000);
    return tx;
  }

  // NEW: Withdraw from event transaction
  withdrawFromEventTransaction(eventId: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::withdraw_from_event`,
      arguments: [
        tx.object(eventId),
        tx.object('0x6'), // Clock object at address 0x6
      ],
    });

    tx.setGasBudget(100000000);
    return tx;
  }

  // NEW: Claim pending stake transaction
  claimPendingStakeTransaction(eventId: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::claim_pending_stake_entry`,
      arguments: [
        tx.object(eventId),
        tx.object('0x6'), // Clock object at address 0x6
      ],
    });

    tx.setGasBudget(100000000);
    return tx;
  }

  // NEW: Create funded mock event transaction
  createFundedMockEventTransaction(params: {
    name: string;
    description: string;
    location: string;
    startTime: number;
    registrationStartTime: number;
    registrationEndTime: number;
    endTime: number;
    stakeAmount: number; // in SUI
    capacity: number;
    mustRequestToJoin: boolean;
    participants: string[];
    attendees: string[];
    pending: string[];
    participantFundAmount: number; // in MIST
    pendingFundAmount: number; // in MIST
  }) {
    console.log('🔧 Creating funded mock event transaction with params:', params);
    
    const tx = new Transaction();
    
    // Split coins for participant fund
    const participantFundCoin = tx.splitCoins(tx.gas, [tx.pure.u64(params.participantFundAmount)]);
    
    // Split coins for pending fund
    const pendingFundCoin = tx.splitCoins(tx.gas, [tx.pure.u64(params.pendingFundAmount)]);
    
    tx.moveCall({
      target: `${this.packageId}::showup::create_mock_event`,
      arguments: [
        tx.pure.string(params.name),
        tx.pure.string(params.description),
        tx.pure.string(params.location),
        tx.pure.u64(params.startTime),
        tx.pure.u64(params.registrationStartTime),
        tx.pure.u64(params.registrationEndTime),
        tx.pure.u64(params.endTime),
        tx.pure.u64(params.stakeAmount),
        tx.pure.u64(params.capacity),
        tx.pure.bool(params.mustRequestToJoin),
        tx.pure.vector('address', params.participants),
        tx.pure.vector('address', params.attendees),
        tx.pure.vector('address', params.pending),
        participantFundCoin,
        pendingFundCoin,
      ],
    });

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST
    console.log('⛽ Gas budget set to:', 100000000, 'MIST (0.1 SUI)');

    return tx;
  }

  // Batch operations for organizer dashboard
  createMarkAttendanceTransaction(eventId: string, participants: string[]) {
    console.log('🔧 Creating mark attendance transaction for participants:', participants);
    
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::mark_attended`,
      arguments: [
        tx.object(eventId),
        tx.pure.vector('address', participants),
      ],
    });
    
    tx.setGasBudget(100000000);
    console.log('⛽ Gas budget set to:', 100000000, 'MIST (0.1 SUI)');
    return tx;
  }

  createAcceptRequestsTransaction(eventId: string, participants: string[]) {
    console.log('🔧 Creating accept requests transaction for participants:', participants);
    
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::accept_requests`,
      arguments: [
        tx.object(eventId),
        tx.pure.vector('address', participants),
      ],
    });
    
    tx.setGasBudget(100000000);
    console.log('⛽ Gas budget set to:', 100000000, 'MIST (0.1 SUI)');
    return tx;
  }

  createRejectRequestsTransaction(eventId: string, participants: string[]) {
    console.log('🔧 Creating reject requests transaction for participants:', participants);
    
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::reject_requests`,
      arguments: [
        tx.object(eventId),
        tx.pure.vector('address', participants),
      ],
    });
    
    tx.setGasBudget(100000000);
    console.log('⛽ Gas budget set to:', 100000000, 'MIST (0.1 SUI)');
    return tx;
  }

  // Create private mock event for testing request workflow
  createPrivateMockEventTransaction(participantFundAmount: number, pendingFundAmount: number) {
    console.log('🔧 Creating private mock event transaction');
    console.log('💰 Participant fund amount:', participantFundAmount, 'MIST');
    console.log('💰 Pending fund amount:', pendingFundAmount, 'MIST');
    
    const tx = new Transaction();
    
    // Split coin for participants (2 participants = 2 SUI total)
    const participantFundCoin = tx.splitCoins(tx.gas, [tx.pure.u64(participantFundAmount * 2)]); // 2 SUI total
    
    // Split coin for pending requests (1 request = 1 SUI)
    const pendingFundCoin = tx.splitCoins(tx.gas, [tx.pure.u64(pendingFundAmount)]); // 1 SUI
    
    // Create the private mock event
    tx.moveCall({
      target: `${this.packageId}::showup::create_mock_event`,
      arguments: [
        tx.pure.string("Private Test Event"),
        tx.pure.string("Testing private event with request workflow"),
        tx.pure.string("Test Location"),
        tx.pure.u64(Math.floor(Date.now() / 1000) + 5 * 60), // start_time
        tx.pure.u64(Math.floor(Date.now() / 1000) + 1 * 60), // registration_start_time
        tx.pure.u64(Math.floor(Date.now() / 1000) + 4 * 60), // registration_end_time
        tx.pure.u64(Math.floor(Date.now() / 1000) + 7 * 60), // end_time
        tx.pure.u64(1000000000), // stake_amount
        tx.pure.u64(3), // capacity
        tx.pure.bool(true), // must_request_to_join
        tx.pure.vector('address', [
          '0x1111111111111111111111111111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222222222222222222222222222'
        ]), // participants
        tx.pure.vector('address', [
          '0x1111111111111111111111111111111111111111111111111111111111111111'
        ]), // attendees
        tx.pure.vector('address', [
          '0x3333333333333333333333333333333333333333333333333333333333333333'
        ]), // pending
        participantFundCoin, // participant_fund (2 SUI total)
        pendingFundCoin, // pending_fund (1 SUI)
      ],
    });

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST
    console.log('⛽ Gas budget set to:', 100000000, 'MIST (0.1 SUI)');

    return tx;
  }


}

// Create executor instance
export const transactionExecutor = new TransactionExecutor(PACKAGE_ID);
