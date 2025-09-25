# ShowUp

> A Web3-native reservation and attendance protocol built on Sui

ShowUp solves the problem of no-shows at restaurants, events, and activities by requiring participants to stake tokens to reserve a spot.

- ✅ **If you attend**, you get your stake back
- ❌ **If you don't**, your stake is redistributed to those who did show up

This creates a transparent and fair system where everyone has skin in the game, incentivizing reliability while rewarding commitment.

---

## 🚀 Features

- **Create Event** — organizer sets stake amount and event end time
- **Join Event** — participants stake tokens to secure their spot
- **Mark Attendance** — organizer scans QR codes to mark attendees
- **Claim Rewards** — after event ends, attendees claim their stake + a share of forfeited stakes

### Example Scenario

```
5 participants stake 10 SUI each (vault = 50 SUI)
1 doesn't attend → forfeits stake
After the event, 4 attendees each claim 12.5 SUI (their 10 + 2.5 from the no-show)
```

---

## 🛠️ Project Structure

```
showup/
├── Move.toml
└── sources/
    └── showup.move   # core smart contract
```

---

## 📦 Prerequisites

- [Rust](https://rustup.rs/)
- [Sui CLI](https://docs.sui.io/build/install)

### Verify Installation

```bash
sui --version
```

### Set up Devnet and Faucet

```bash
sui client new-env --alias devnet --rpc https://fullnode.devnet.sui.io:443
sui client switch --env devnet
sui client new-address ed25519
sui client faucet
```

---

## ⚡ Usage

### 1. Build

```bash
sui move build
```

### 2. Publish to Devnet

```bash
sui client publish --gas-budget 100000000
```

Copy the package ID from the output.

### 3. Create Event

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module showup \
  --function create_event \
  --args 10 1234567890 \
  --gas-budget 100000000
```

**Parameters:**
- `10` = stake amount in SUI
- `1234567890` = end time (epoch for demo)

### 4. Join Event

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module showup \
  --function join_event \
  --args <EVENT_ID> <COIN_ID> \
  --gas-budget 100000000
```

### 5. Mark Attendance

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module showup \
  --function mark_attended \
  --args <EVENT_ID> <PARTICIPANT_ADDRESS> \
  --gas-budget 100000000
```

### 6. Claim Rewards

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module showup \
  --function claim \
  --args <EVENT_ID> \
  --gas-budget 100000000
```

---

## 🔮 Future Work

- **Trustless POAPs** — replace organizer check-in with geofenced proofs of attendance
- **Reputation Layer** — build a portable on-chain reliability score
- **Dynamic Staking** — allow variable stake amounts
- **Secondary Market** — tradable reservations

---

## 👥 Team

Built at [Hackathon Name] on the Sui blockchain.