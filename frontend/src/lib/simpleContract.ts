import { PACKAGE_ID } from './sui';

// Simple contract service that works with dapp-kit
export class SimpleShowUpContract {
  constructor(private packageId: string) {}

  // Generate transaction data for create_event
  createEventTransaction(params: {
    name: string;
    description: string;
    location: string;
    startTime: number;
    endTime: number;
    stakeAmount: number; // in SUI
    capacity: number;
  }) {
    return {
      target: `${this.packageId}::showup::create_event`,
      arguments: [
        params.name,
        params.description,
        params.location,
        params.startTime,
        params.endTime,
        Math.floor(params.stakeAmount * 1_000_000_000), // Convert to MIST
        params.capacity,
      ],
    };
  }

  // Generate transaction data for join_event
  joinEventTransaction(eventId: string, stakeCoinId: string) {
    return {
      target: `${this.packageId}::showup::join_event`,
      arguments: [eventId, stakeCoinId],
    };
  }

  // Generate transaction data for mark_attended
  markAttendedTransaction(eventId: string, participantAddress: string) {
    return {
      target: `${this.packageId}::showup::mark_attended`,
      arguments: [eventId, participantAddress],
    };
  }

  // Generate transaction data for claim
  claimTransaction(eventId: string) {
    return {
      target: `${this.packageId}::showup::claim`,
      arguments: [eventId],
    };
  }

  // Generate transaction data for refund
  refundTransaction(eventId: string) {
    return {
      target: `${this.packageId}::showup::refund`,
      arguments: [eventId],
    };
  }

  // Generate transaction data for cancel_event
  cancelEventTransaction(eventId: string) {
    return {
      target: `${this.packageId}::showup::cancel_event`,
      arguments: [eventId],
    };
  }

  // Helper function to convert SUI to MIST
  suiToMist(sui: number): number {
    return Math.floor(sui * 1_000_000_000);
  }

  // Helper function to convert MIST to SUI
  mistToSui(mist: number): number {
    return mist / 1_000_000_000;
  }

  // Helper function to get current epoch (for testing)
  getCurrentEpoch(): number {
    return Math.floor(Date.now() / 1000);
  }

  // Helper function to create event end time
  createEndTime(hoursFromNow: number): number {
    return this.getCurrentEpoch() + (hoursFromNow * 3600);
  }
}

// Error codes from the Move contract
export const ERROR_CODES = {
  E_INSUFFICIENT_STAKE: 0,
  E_NOT_ORGANIZER: 1,
  E_EVENT_NOT_ENDED: 2,
  E_DID_NOT_ATTEND: 3,
  E_CAPACITY_EXCEEDED: 4,
  E_ALREADY_CLAIMED: 5,
  E_EVENT_ALREADY_STARTED: 6,
  E_EVENT_NOT_CANCELLED: 7,
  E_NOT_PARTICIPANT: 8,
} as const;

// Error messages for user display
export const ERROR_MESSAGES = {
  [ERROR_CODES.E_INSUFFICIENT_STAKE]: 'Insufficient stake amount. Please provide the correct stake amount.',
  [ERROR_CODES.E_NOT_ORGANIZER]: 'Only the event organizer can perform this action.',
  [ERROR_CODES.E_EVENT_NOT_ENDED]: 'Event has not ended yet. Please wait until the event ends.',
  [ERROR_CODES.E_DID_NOT_ATTEND]: 'You did not attend this event. Only attendees can claim rewards.',
  [ERROR_CODES.E_CAPACITY_EXCEEDED]: 'Event capacity exceeded. No more participants can join.',
  [ERROR_CODES.E_ALREADY_CLAIMED]: 'You have already claimed your reward or refund.',
  [ERROR_CODES.E_EVENT_ALREADY_STARTED]: 'Event has already started. You cannot join now.',
  [ERROR_CODES.E_EVENT_NOT_CANCELLED]: 'Event is not cancelled. Only cancelled events allow refunds.',
  [ERROR_CODES.E_NOT_PARTICIPANT]: 'You are not a participant in this event.',
} as const;

// Helper function to get user-friendly error message
export function getErrorMessage(errorCode: number): string {
  return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || 'An unknown error occurred.';
}

// Create contract instance
export const showUpContract = new SimpleShowUpContract(PACKAGE_ID);

