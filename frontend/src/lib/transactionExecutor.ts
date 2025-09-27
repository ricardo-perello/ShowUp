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
  claimTransaction(eventId: string) {
    const tx = new Transaction();
    
    const [coin] = tx.moveCall({
      target: `${this.packageId}::showup::claim`,
      arguments: [tx.object(eventId)],
    });

    // Transfer the claimed coin back to user
    tx.transferObjects([coin], tx.pure.address('$SENDER'));

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST

    return tx;
  }

  // Refund transaction
  refundTransaction(eventId: string) {
    const tx = new Transaction();
    
    const [coin] = tx.moveCall({
      target: `${this.packageId}::showup::refund`,
      arguments: [tx.object(eventId)],
    });

    // Transfer the refunded coin back to user
    tx.transferObjects([coin], tx.pure.address('$SENDER'));

    // Set gas budget
    tx.setGasBudget(100000000); // 0.1 SUI in MIST

    return tx;
  }

  // Cancel event transaction
  cancelEventTransaction(eventId: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::cancel_event`,
      arguments: [tx.object(eventId)],
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
    return Math.floor(Date.now() / 1000);
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
      ],
    });

    tx.setGasBudget(100000000);
    return tx;
  }

  // NEW: Claim pending stake transaction
  claimPendingStakeTransaction(eventId: string) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::showup::claim_pending_stake`,
      arguments: [
        tx.object(eventId),
      ],
    });

    tx.setGasBudget(100000000);
    return tx;
  }
}

// Create executor instance
export const transactionExecutor = new TransactionExecutor(PACKAGE_ID);
