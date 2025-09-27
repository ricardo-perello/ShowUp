# ShowUp Frontend Integration Guide

This guide explains how to integrate the ShowUp Move contract with the Next.js frontend using the Sui TypeScript SDK.

## 🚀 Quick Start

### 1. Deploy the Contract

First, deploy your Move contract to Sui testnet:

```bash
# In the root directory
sui move build
sui client publish --gas-budget 100000000
```

Copy the package ID from the output and update `src/lib/sui.ts`:

```typescript
export const PACKAGE_ID = '0xYOUR_PACKAGE_ID_HERE';
```

### 2. Install Dependencies

The frontend already has the required dependencies:

```json
{
  "@mysten/dapp-kit": "^0.18.0",
  "@mysten/sui": "^1.38.0",
  "@mysten/sui.js": "^0.54.1",
  "@mysten/wallet-kit": "^0.8.6"
}
```

### 3. Start Development Server

```bash
cd frontend
npm run dev
```

## 📁 File Structure

```
frontend/src/
├── lib/
│   ├── contract.ts          # Contract service with PTB calls
│   ├── eventLifecycle.ts    # Complete event lifecycle management
│   └── sui.ts              # Sui configuration
├── hooks/
│   └── useShowUp.ts        # React hooks for easy integration
└── app/
    ├── create/page.tsx     # Event creation (✅ Updated)
    ├── checkin/[id]/page.tsx # QR scanner (✅ Updated)
    └── events/[id]/page.tsx # Event details (TODO)
```

## 🔧 Core Integration Files

### 1. Contract Service (`lib/contract.ts`)

**Purpose**: Direct contract interaction using PTBs

**Key Features**:
- All contract functions as TypeScript methods
- Error code mapping to user-friendly messages
- SUI/MIST conversion utilities
- Read-only contract queries

**Usage**:
```typescript
import { ShowUpContract } from '@/lib/contract';
import { useSuiClient } from '@mysten/dapp-kit';

const suiClient = useSuiClient();
const contract = new ShowUpContract(suiClient);

// Create event
const result = await contract.createEvent({
  name: 'My Event',
  description: 'Event description',
  location: 'EPFL Campus',
  startTime: Math.floor(Date.now() / 1000),
  endTime: Math.floor(Date.now() / 1000) + 7200, // 2 hours
  stakeAmount: 1.0, // 1 SUI
  capacity: 100
});
```

### 2. Event Lifecycle Service (`lib/eventLifecycle.ts`)

**Purpose**: High-level event management with user status tracking

**Key Features**:
- Complete event lifecycle management
- User permission checking
- State management (EventState, ParticipationState)
- QR code generation/parsing
- SUI coin management

**Usage**:
```typescript
import { EventLifecycleService } from '@/lib/eventLifecycle';

const lifecycle = new EventLifecycleService(contract, suiClient);

// Get complete event data with user status
const { event, userStatus, eventState } = await lifecycle.getEventWithUserStatus(eventId, userAddress);

// Check what user can do
if (userStatus.canJoin) {
  await lifecycle.joinEvent(eventId, stakeCoinId);
}
if (userStatus.canClaim) {
  await lifecycle.claim(eventId, userAddress);
}
```

### 3. React Hooks (`hooks/useShowUp.ts`)

**Purpose**: Easy React integration with loading states and error handling

**Key Features**:
- Loading states for all operations
- Error handling with user-friendly messages
- Event-specific hook (`useEvent`)
- Automatic data refreshing

**Usage**:
```typescript
import { useShowUp, useEvent } from '@/hooks/useShowUp';

function MyComponent() {
  const { createEvent, joinEvent, loading, error } = useShowUp();
  const { event, userStatus, refreshEvent } = useEvent(eventId);
  
  const handleCreate = async () => {
    try {
      const result = await createEvent({
        name: 'My Event',
        // ... other params
      });
      console.log('Event created:', result.eventId);
    } catch (err) {
      console.error('Error:', err.message);
    }
  };
}
```

## 🎯 Complete Event Lifecycle Flow

### 1. Event Creation Flow

```typescript
// 1. User fills form
const formData = {
  name: 'Hackathon Demo',
  description: 'ShowUp contract demo',
  location: 'EPFL Campus',
  stakeAmount: 1.0, // SUI
  capacity: 50,
  durationHours: 2
};

// 2. Create event
const { createEvent } = useShowUp();
const result = await createEvent(formData);

// 3. Redirect to event page
router.push(`/events/${result.eventId}`);
```

### 2. Participant Join Flow

```typescript
// 1. Get user's SUI coins
const { getUserSUICoins, mergeSUICoins } = useShowUp();
const coins = await getUserSUICoins(stakeAmountInMist);

// 2. Merge coins if needed
const stakeCoinId = await mergeSUICoins(coins);

// 3. Join event
const { joinEvent } = useShowUp();
await joinEvent(eventId, stakeCoinId);
```

### 3. QR Code Attendance Flow

```typescript
// 1. Generate QR code for participant
const { generateQRPayload } = useShowUp();
const qrData = generateQRPayload(eventId);

// 2. Display QR code
<QRCode value={qrData} />

// 3. Organizer scans QR code
const { parseQRPayload, markAttendance } = useShowUp();
const payload = parseQRPayload(scannedData);
if (payload) {
  await markAttendance(eventId, payload.address);
}
```

### 4. Claim/Refund Flow

```typescript
// 1. Check user status
const { event, userStatus } = useEvent(eventId);

// 2. Claim rewards (if attended)
if (userStatus.canClaim) {
  const { claim } = useShowUp();
  const result = await claim(eventId);
  console.log('Claimed:', result.amount, 'SUI');
}

// 3. Refund (if cancelled)
if (userStatus.canRefund) {
  const { refund } = useShowUp();
  const result = await refund(eventId);
  console.log('Refunded:', result.amount, 'SUI');
}
```

## 🛡️ Error Handling

The integration includes comprehensive error handling:

### Error Codes
```typescript
const ERROR_CODES = {
  E_INSUFFICIENT_STAKE: 0,
  E_NOT_ORGANIZER: 1,
  E_EVENT_NOT_ENDED: 2,
  E_DID_NOT_ATTEND: 3,
  E_CAPACITY_EXCEEDED: 4,
  E_ALREADY_CLAIMED: 5,
  E_EVENT_ALREADY_STARTED: 6,
  E_EVENT_NOT_CANCELLED: 7,
  E_NOT_PARTICIPANT: 8,
};
```

### User-Friendly Messages
```typescript
const ERROR_MESSAGES = {
  [ERROR_CODES.E_INSUFFICIENT_STAKE]: 'Insufficient stake amount. Please provide the correct stake amount.',
  [ERROR_CODES.E_NOT_ORGANIZER]: 'Only the event organizer can perform this action.',
  // ... more messages
};
```

### Usage in Components
```typescript
const { error, clearError } = useShowUp();

// Display error
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
    <span className="text-red-800">{error}</span>
  </div>
)}
```

## 🔄 State Management

### Event States
```typescript
enum EventState {
  CREATED = 'created',      // Event created, participants can join
  JOINING = 'joining',      // Event started, no more joins
  IN_PROGRESS = 'in_progress', // Event in progress, marking attendance
  ENDED = 'ended',          // Event ended, can claim
  CANCELLED = 'cancelled',  // Event cancelled, can refund
}
```

### User Participation States
```typescript
enum ParticipationState {
  NOT_PARTICIPANT = 'not_participant',
  PARTICIPANT = 'participant',
  ATTENDEE = 'attendee',
  CLAIMED = 'claimed',
  REFUNDED = 'refunded',
}
```

### User Capabilities
```typescript
interface UserEventStatus {
  isOrganizer: boolean;
  isParticipant: boolean;
  isAttendee: boolean;
  hasClaimed: boolean;
  canJoin: boolean;
  canClaim: boolean;
  canRefund: boolean;
  canCancel: boolean;
  canMarkAttendance: boolean;
}
```

## 🎨 UI Components

### Event Creation Form
- ✅ **Updated**: Full form with all required fields
- ✅ **Error handling**: Display contract errors
- ✅ **Loading states**: Show progress during creation

### QR Scanner
- ✅ **Updated**: Real contract integration
- ✅ **Real-time updates**: Refresh attendees list
- ✅ **Error handling**: Show scan/attendance errors

### Event Details (TODO)
- Event information display
- Join/claim/refund buttons
- QR code generation for participants
- Real-time status updates

## 🚀 Next Steps

1. **Deploy Contract**: Update `PACKAGE_ID` in `src/lib/sui.ts`
2. **Test Integration**: Use the updated create and checkin pages
3. **Complete Event Details**: Implement the event details page
4. **Add Real-time Updates**: Consider using Sui events for live updates
5. **Polish UI**: Add animations, better error states, etc.

## 🔧 Development Tips

### Testing with Local Network
```typescript
// In src/lib/sui.ts
export const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  // ... other networks
});
```

### Debugging Contract Calls
```typescript
// Enable detailed logging
const result = await contract.createEvent(params);
console.log('Transaction result:', result);
console.log('Created objects:', result.effects?.created);
```

### Handling SUI Coins
```typescript
// Get user's SUI balance
const coins = await suiClient.getCoins({
  owner: userAddress,
  coinType: '0x2::sui::SUI',
});

// Merge coins if needed
const tx = new TransactionBlock();
const primaryCoin = tx.object(coins.data[0].coinObjectId);
const mergeCoins = coins.data.slice(1).map(coin => tx.object(coin.coinObjectId));
tx.mergeCoins(primaryCoin, mergeCoins);
```

## 📚 Additional Resources

- [Sui TypeScript SDK Documentation](https://docs.sui.io/build/sui-typescript-sdk)
- [Programmable Transaction Blocks](https://docs.sui.io/build/programming-with-sui)
- [Sui Move Language](https://docs.sui.io/build/move)
- [ShowUp Contract Source](../sources/showup.move)

---

**Ready to build!** 🎉 Your frontend is now fully integrated with the ShowUp Move contract. Start by deploying the contract and updating the package ID, then test the create and checkin flows.
