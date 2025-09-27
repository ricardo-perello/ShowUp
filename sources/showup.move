/*
/// Module: showup
module showup::showup;
*/
module showup::showup {

    use sui::balance::{Balance, Self};
    use sui::coin::{Coin, Self};
    use sui::sui::SUI;
    use std::string::String;
    use sui::table::{Self, Table};

    // Error codes
    const E_INSUFFICIENT_STAKE: u64 = 0;
    const E_NOT_ORGANIZER: u64 = 1;
    const E_EVENT_NOT_ENDED: u64 = 2;
    const E_DID_NOT_ATTEND: u64 = 3;
    const E_CAPACITY_EXCEEDED: u64 = 4;
    const E_ALREADY_CLAIMED: u64 = 5;
    const E_EVENT_ALREADY_STARTED: u64 = 6;
    const E_EVENT_NOT_CANCELLED: u64 = 7;
    const E_NOT_PARTICIPANT: u64 = 8;
    const E_EVENT_REQUIRES_APPROVAL: u64 = 9;
    const E_NOT_IN_REQUESTS: u64 = 10;

    /// Event object definition
    /// COMPLETELY IMMUTABLE after creation - NO ONE can modify event details
    /// Only way to "change" an event is to create a new one
    public struct Event has key {
        id: sui::object::UID,
        must_request_to_join: bool,      //Immutable - event is public or private
        organizer: address,
        name: String,                    // Immutable - cannot be changed
        description: String,             // Immutable - cannot be changed
        location: String,                // Immutable - cannot be changed
        start_time: u64,                 // Immutable - cannot be changed
        end_time: u64,                   // Mutable - only gets set to 0 when cancelled
        stake_amount: u64,               // Immutable - cannot be changed
        capacity: u64,                   // Immutable - cannot be changed
        participants: Table<address, bool>,   // Mutable - participants can join
        pending_requests: Table<address, bool>, // Mutable - pending requests for private events
        attendees: Table<address, bool>,      // Mutable - organizer can mark attendance
        claimed: Table<address, bool>,        // Mutable - attendees can claim rewards
        vault: Balance<SUI>,            // Mutable - grows as participants join
    }

    public fun create_event(
        name: String,
        description: String,
        location: String,
        start_time: u64,
        end_time: u64,
        stake_amount: u64,
        capacity: u64,
        must_request_to_join: bool,
        ctx: &mut sui::tx_context::TxContext
    ): Event {
        Event {
            id: sui::object::new(ctx),
            must_request_to_join,
            organizer: sui::tx_context::sender(ctx),
            name,
            description,
            location,
            start_time,
            end_time,
            stake_amount,
            capacity,
            participants: table::new<address, bool>(ctx),
            pending_requests: table::new<address, bool>(ctx),
            attendees: table::new<address, bool>(ctx),
            claimed: table::new<address, bool>(ctx),
            vault: balance::zero<SUI>(),
        }
    }

    public fun join_event(
        event: &mut Event,
        _coins: Coin<SUI>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Only allow direct joining for public events
        assert!(!event.must_request_to_join, E_EVENT_REQUIRES_APPROVAL);

        let sender = sui::tx_context::sender(ctx);
        let now = sui::tx_context::epoch(ctx);

        // Must join before event starts
        assert!(now < event.start_time, E_EVENT_ALREADY_STARTED);

        // Verify correct stake
        let amount = coin::value(&_coins);
        assert!(amount == event.stake_amount, E_INSUFFICIENT_STAKE);

        // Check capacity (0 means unlimited)
        if (event.capacity > 0) {
            let current_participants = table::length(&event.participants);
            assert!(current_participants < event.capacity, E_CAPACITY_EXCEEDED);
        };

        // Deposit coins into vault
        let sui_balance = coin::into_balance(_coins);
        balance::join(&mut event.vault, sui_balance);

        // Add participant (aborts if already joined)
        table::add(&mut event.participants, sender, true);
    }

    public fun request_to_join(
        event: &mut Event,
        _coins: Coin<SUI>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Only allow requests for private events
        assert!(event.must_request_to_join, E_EVENT_REQUIRES_APPROVAL);

        let sender = sui::tx_context::sender(ctx);
        let now = sui::tx_context::epoch(ctx);

        // Must request before event starts
        assert!(now < event.start_time, E_EVENT_ALREADY_STARTED);

        // Verify correct stake
        let amount = coin::value(&_coins);
        assert!(amount == event.stake_amount, E_INSUFFICIENT_STAKE);

        // Check capacity (0 means unlimited)
        if (event.capacity > 0) {
            let current_participants = table::length(&event.participants);
            let pending_requests = table::length(&event.pending_requests);
            assert!(current_participants + pending_requests < event.capacity, E_CAPACITY_EXCEEDED);
        };

        // Deposit coins into vault
        let sui_balance = coin::into_balance(_coins);
        balance::join(&mut event.vault, sui_balance);

        // Add to pending requests (aborts if already requested)
        table::add(&mut event.pending_requests, sender, true);
    }

    public fun accept_requests(
        event: &mut Event,
        participants: vector<address>,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == event.organizer, E_NOT_ORGANIZER);
        
        // Check capacity before accepting any requests
        if (event.capacity > 0) {
            let current_participants = table::length(&event.participants);
            let requests_to_accept = vector::length(&participants);
            assert!(current_participants + requests_to_accept <= event.capacity, E_CAPACITY_EXCEEDED);
        };
        
        let mut i = 0;
        let len = vector::length(&participants);
        while (i < len) {
            let participant = *vector::borrow(&participants, i);
            // Only accept if they have a pending request
            assert!(table::contains(&event.pending_requests, participant), E_NOT_IN_REQUESTS);
            // Remove from pending requests
            table::remove(&mut event.pending_requests, participant);
            // Add to participants (aborts if already joined)
            table::add(&mut event.participants, participant, true);
            i = i + 1;
        };
    }

    public fun reject_requests(
        event: &mut Event,
        participants: vector<address>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == event.organizer, E_NOT_ORGANIZER);
        
        let mut i = 0;
        let len = vector::length(&participants);
        while (i < len) {
            let participant = *vector::borrow(&participants, i);
            // Only reject if they have a pending request
            assert!(table::contains(&event.pending_requests, participant), E_NOT_IN_REQUESTS);
            // Remove from pending requests
            table::remove(&mut event.pending_requests, participant);
            // Return stake amount to participant
            let refund_balance = balance::split(&mut event.vault, event.stake_amount);
            let refund_coin = coin::from_balance(refund_balance, ctx);
            sui::transfer::public_transfer(refund_coin, participant);
            i = i + 1;
        };
    }

    public fun mark_attended(
        event: &mut Event,
        participants: vector<address>,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == event.organizer, E_NOT_ORGANIZER);
        
        let mut i = 0;
        let len = vector::length(&participants);
        while (i < len) {
            let participant = *vector::borrow(&participants, i);
            // Only participants can be marked as attended (avoid accidental scans)
            assert!(table::contains(&event.participants, participant), E_NOT_PARTICIPANT);
            // Add attendee (aborts if already marked)
            table::add(&mut event.attendees, participant, true);
            i = i + 1;
        };
    }

    public fun claim(
        event: &mut Event,
        ctx: &mut sui::tx_context::TxContext
    ): Coin<SUI> {
        let sender = sui::tx_context::sender(ctx);
        let now = sui::tx_context::epoch(ctx);

        // Event must have ended
        assert!(now >= event.end_time, E_EVENT_NOT_ENDED);

        // Must have attended and not already withdrawn (claim/refund)
        assert!(table::contains(&event.attendees, sender), E_DID_NOT_ATTEND);
        assert!(!table::contains(&event.claimed, sender), E_ALREADY_CLAIMED);

        // Mark claimed first (protect against reentrancy-style patterns)
        table::add(&mut event.claimed, sender, true);

        // Equal split across attendees
        let n_attendees = table::length(&event.attendees);
        // n_attendees > 0 because sender ∈ attendees
        let payout_amount = balance::value(&event.vault) / n_attendees;
        let payout_bal = balance::split(&mut event.vault, payout_amount);
        coin::from_balance(payout_bal, ctx)
    }

    public fun cancel_event(
        event: &mut Event,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        let now = sui::tx_context::epoch(ctx);
        
        assert!(sender == event.organizer, E_NOT_ORGANIZER);
        assert!(now < event.start_time, E_EVENT_ALREADY_STARTED);
        
        // Mark cancelled
        event.end_time = 0;
    }

    public fun refund(
        event: &mut Event,
        ctx: &mut sui::tx_context::TxContext
    ): Coin<SUI> {
        let sender = sui::tx_context::sender(ctx);
        
        // Only when cancelled
        assert!(event.end_time == 0, E_EVENT_NOT_CANCELLED);
        // Only participants, and only if not already withdrawn via claim/refund
        assert!(table::contains(&event.participants, sender), E_NOT_PARTICIPANT);
        assert!(!table::contains(&event.claimed, sender), E_ALREADY_CLAIMED);
        
        // Mark claimed to block double-withdrawal
        table::add(&mut event.claimed, sender, true);
        
        // Fixed refund = stake amount
        let refund_balance = balance::split(&mut event.vault, event.stake_amount);
        coin::from_balance(refund_balance, ctx)
    }

    // Getter functions for testing and frontend
    public fun get_organizer(event: &Event): address {
        event.organizer
    }

    public fun get_name(event: &Event): String {
        event.name
    }

    public fun get_description(event: &Event): String {
        event.description
    }

    public fun get_location(event: &Event): String {
        event.location
    }

    public fun get_start_time(event: &Event): u64 {
        event.start_time
    }

    public fun get_end_time(event: &Event): u64 {
        event.end_time
    }

    public fun get_stake_amount(event: &Event): u64 {
        event.stake_amount
    }

    public fun get_capacity(event: &Event): u64 {
        event.capacity
    }

    public fun get_participants_count(event: &Event): u64 {
        table::length(&event.participants)
    }

    public fun get_attendees_count(event: &Event): u64 {
        table::length(&event.attendees)
    }

    public fun get_claimed_count(event: &Event): u64 {
        table::length(&event.claimed)
    }

    public fun get_vault_balance(event: &Event): u64 {
        balance::value(&event.vault)
    }

    public fun has_unlimited_capacity(event: &Event): bool {
        event.capacity == 0
    }

    public fun spots_left(event: &Event): u64 {
        if (event.capacity == 0) { 
            0 
        } else { 
            event.capacity - table::length(&event.participants) 
        }
    }

    public fun is_cancelled(event: &Event): bool {
        event.end_time == 0
    }

    public fun is_participant(event: &Event, participant: address): bool {
        table::contains(&event.participants, participant)
    }

    public fun is_attendee(event: &Event, attendee: address): bool {
        table::contains(&event.attendees, attendee)
    }

    public fun has_claimed(event: &Event, claimant: address): bool {
        table::contains(&event.claimed, claimant)
    }

    public fun must_request_to_join(event: &Event): bool {
        event.must_request_to_join
    }

    public fun get_pending_requests_count(event: &Event): u64 {
        table::length(&event.pending_requests)
    }

    public fun has_pending_request(event: &Event, participant: address): bool {
        table::contains(&event.pending_requests, participant)
    }

    public fun total_requested_spots(event: &Event): u64 {
        table::length(&event.participants) + table::length(&event.pending_requests)
    }


    // Test-only function to destroy event for cleanup
    #[test_only]
    public fun destroy_event(event: Event) {
        let Event {
            id,
            must_request_to_join: _,
            organizer,
            name: _,
            description: _,
            location: _,
            start_time: _,
            end_time: _,
            stake_amount: _,
            capacity: _,
            participants,
            pending_requests,
            attendees,
            claimed,
            vault,
        } = event;
        
        // Use the values to avoid drop error
        sui::object::delete(id);
        // For test cleanup, we'll transfer the tables to a dummy address
        // In production, you might want to ensure tables are empty before destroying
        sui::transfer::public_transfer(participants, @0x0);
        sui::transfer::public_transfer(pending_requests, @0x0);
        sui::transfer::public_transfer(attendees, @0x0);
        sui::transfer::public_transfer(claimed, @0x0);
        // Send vault balance to organizer
        let coin = coin::from_balance(vault, &mut sui::tx_context::dummy());
        sui::transfer::public_transfer(coin, organizer);
    }
}
