# ShowUp 💧
## Turn RSVPs into real commitments.

Flaky RSVPs and no-shows waste time, money, and energy for organizers and participants alike. ShowUp solves this with a simple mechanism: staking SUI.

When you sign up for an event, you stake a small deposit. If you show up, you get your stake back — plus a share of the no-shows' penalties. If you don't, your stake is redistributed to those who did. Attendance becomes accountability, and commitment is rewarded.

## ✨ Features

### For Organizers
- **Create Events**: Define event name, description, location, time, stake amount, and capacity.
- **Vault System**: A vault automatically collects all participant stakes.
- **QR Code Check-in**: Use a QR scanner at the entrance to mark attendees on-chain.
- **Cancellations**: Cancel events before they start; participants automatically get refunds.
- **Transparency**: Live view of participants, attendees, and vault balance.

### For Participants
- **Join Events by Staking**: Commit your spot by staking SUI directly in the event's vault.
- **On-site Check-in**: Show your wallet-generated QR code to prove attendance.
- **Claim Rewards**: After the event ends, claim your stake back — plus a share of defaulted deposits.
- **Refunds**: Get your deposit back if the organizer cancels.
- **My Reservations Dashboard**: See all your upcoming and past events, attendance status, and claims.

### Future Extensions (V2+)
- **Geofenced Proof-of-Attendance (POAP)**: Trustless check-in based on being at the event's location, without relying on organizers.
- **Gamification**: Attendance streaks, loyalty scores, and badges.
- **Integration with Calendars & Socials**: Auto-sync events with calendars and social platforms.

## 🔑 Why It Matters
- **Incentivized Attendance**: People have real skin in the game.
- **Reduced No-Shows**: Organizers save money and resources.
- **Fair Redistribution**: Attendees benefit directly when others don't show.
- **On-Chain Transparency**: Everything is verifiable and trustless.

## 🛠 Tech Stack
- **Smart Contracts**: Built in Move on the Sui blockchain.
- **Frontend**: Next.js + Tailwind + shadcn/ui.
- **Wallets**: Sui Wallet Adapter / compatible wallets.
- **QR System**: qrcode.react for generation, react-qr-reader for scanning.

ShowUp makes events more reliable, fun, and fair — powered by Web3 incentives.

## Architecture

### Smart Contract (Move)
- **Module**: `showup::showup`
- **Deployed Package ID**: `0xbd67548019214de91ec4dbb415b3a0a6ad10a6041a03e62e038db4bb0335d9c8`
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