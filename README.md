# ShowUp - Web3 Event Reservations

A decentralized event reservations and attendance protocol built on Sui blockchain using Move smart contracts and Next.js frontend.

## Overview

ShowUp enables event organizers to create events where participants stake tokens to join. Organizers can scan QR codes to mark attendance, and attendees can claim their stake plus a share of no-show penalties after the event ends.

## Features

- **Event Creation**: Organizers create events with stake amounts and end times
- **Token Staking**: Participants join events by staking SUI tokens
- **QR Code Attendance**: Organizers scan participant QR codes to mark attendance
- **Reward Distribution**: Attendees claim their stake plus no-show penalties
- **Web3 Integration**: Built with Sui Wallet Adapter for seamless wallet connection

## Architecture

### Smart Contract (Move)
- **Module**: `showup::showup`
- **Deployed Package ID**: `0xcfa197d066b4982c14fde0ba7379ad3bb018f820da4cd161b966cac1019a1f66`
- **Network**: Sui Devnet

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Styling**: TailwindCSS
- **Wallet Integration**: Sui Wallet Adapter (@mysten/dapp-kit)
- **QR Code**: qrcode.react for generation, html5-qrcode for scanning

## Smart Contract Functions

### Core Functions
- `create_event(stake_amount, end_time, ctx) → Event`: Creates a new event
- `join_event(&mut Event, Coin<SUI>, ctx)`: Allows participants to join by staking
- `mark_attended(&mut Event, address, ctx)`: Marks participant as attended
- `claim(&mut Event, ctx) → Coin<SUI>`: Claims stake and rewards

### Error Codes
- `0`: Insufficient stake
- `1`: Not organizer
- `2`: Event not ended
- `3`: Did not attend

## Getting Started

### Prerequisites
- Node.js 18+
- Sui CLI
- A Sui wallet (Mysten, Ethos, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ShowUp
   ```

2. **Install dependencies**
   ```bash
   # Install Move dependencies
   sui move build

   # Install frontend dependencies
   cd frontend
   npm install
   ```

3. **Configure Sui CLI**
   ```bash
   sui client new-address ed25519
   sui client faucet
   ```

### Running the Application

1. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open your browser**
   Navigate to `http://localhost:3000`

### Deploying the Smart Contract

The smart contract is already deployed to Sui Devnet. If you need to redeploy:

```bash
sui client publish --gas-budget 100000000
```

## Usage

### For Organizers
1. Connect your wallet
2. Click "Create Event" and fill in stake amount and end time
3. Share the event with participants
4. On event day, use the QR scanner to mark attendance
5. No direct funds management required

### For Participants
1. Connect your wallet
2. Browse available events
3. Join events by staking the required amount
4. Receive a QR code for the event
5. Show QR code to organizer at the event
6. After event ends, claim your stake plus rewards

## Project Structure

```
ShowUp/
├── sources/
│   └── showup.move          # Main smart contract
├── tests/
│   └── showup_tests.move    # Smart contract tests
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities and configuration
│   └── package.json
├── Move.toml                # Move package configuration
└── README.md
```

## Frontend Pages

- `/` - Landing page with wallet connection and role selection
- `/create` - Event creation form for organizers
- `/events` - List of all events
- `/events/[id]` - Event details page
- `/checkin/[id]` - QR scanner for organizers
- `/my-events` - User's created and joined events

## Testing

### Smart Contract Tests
```bash
sui move test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Future Enhancements

- **Trustless POAPs**: Geofence and GPS check-ins
- **Reputation Layer**: Reliability scores based on attendance history
- **Dynamic Stake Levels**: Tiered participation fees
- **Secondary Market**: Resell reservations before events

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue in the repository.