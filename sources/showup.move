/*
/// Module: showup
module showup::showup;
*/
module showup::showup {

    use sui::balance::{Balance, Self};
    use sui::coin::{Coin, Self};
    use sui::sui::SUI;

    /// Event object definition
    public struct Event has key {
        id: sui::object::UID,
        organizer: address,
        stake_amount: u64,
        end_time: u64,
        participants: vector<address>,
        attendees: vector<address>,
        vault: Balance<SUI>,
    }

    public fun create_event(
    stake_amount: u64,
    end_time: u64,
    ctx: &mut sui::tx_context::TxContext
    ): Event {
        Event {
            id: sui::object::new(ctx),
            organizer: sui::tx_context::sender(ctx),
            stake_amount,
            end_time,
            participants: vector::empty<address>(),
            attendees: vector::empty<address>(),
            vault: balance::zero<SUI>(),
        }
    }

        public fun join_event(
        event: &mut Event,
        _coins: Coin<SUI>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);

        // Verify correct stake
        let amount = coin::value(&_coins);
        assert!(amount == event.stake_amount, 0);

        // Deposit coins into vault
        let sui_balance = coin::into_balance(_coins);
        balance::join(&mut event.vault, sui_balance);

        // Add participant
        vector::push_back(&mut event.participants, sender);
    }

        public fun mark_attended(
        event: &mut Event,
        participant: address,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == event.organizer, 1);
        vector::push_back(&mut event.attendees, participant);
    }

        public fun claim(
        event: &mut Event,
        ctx: &mut sui::tx_context::TxContext
    ): Coin<SUI> {
        let sender = sui::tx_context::sender(ctx);
        let now = sui::tx_context::epoch(ctx); // for hackathon just use epoch as timestamp

        // Ensure event ended
        assert!(now >= event.end_time, 2);

        // Ensure sender attended
        let mut found = false;
        let n_attendees = vector::length(&event.attendees);
        let mut i = 0;
        while (i < n_attendees) {
            if (vector::borrow(&event.attendees, i) == &sender) {
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, 3);

        // Payout = vault / n_attendees
        let _payout_amount = balance::value(&event.vault) / n_attendees;
        let _payout = balance::split(&mut event.vault, _payout_amount);
        coin::from_balance(_payout, ctx)
    }

    // Getter functions for testing
    public fun get_organizer(event: &Event): address {
        event.organizer
    }

    public fun get_stake_amount(event: &Event): u64 {
        event.stake_amount
    }

    public fun get_end_time(event: &Event): u64 {
        event.end_time
    }

    public fun get_participants_count(event: &Event): u64 {
        vector::length(&event.participants)
    }

    public fun get_attendees_count(event: &Event): u64 {
        vector::length(&event.attendees)
    }

    public fun get_vault_balance(event: &Event): u64 {
        balance::value(&event.vault)
    }

    public fun is_participant(event: &Event, participant: address): bool {
        let n_participants = vector::length(&event.participants);
        let mut i = 0;
        while (i < n_participants) {
            if (vector::borrow(&event.participants, i) == &participant) {
                return true
            };
            i = i + 1;
        };
        false
    }

    public fun is_attendee(event: &Event, attendee: address): bool {
        let n_attendees = vector::length(&event.attendees);
        let mut i = 0;
        while (i < n_attendees) {
            if (vector::borrow(&event.attendees, i) == &attendee) {
                return true
            };
            i = i + 1;
        };
        false
    }

    // Test-only function to destroy event for cleanup
    #[test_only]
    public fun destroy_event(event: Event) {
        let Event {
            id,
            organizer,
            stake_amount: _,
            end_time: _,
            participants,
            attendees,
            vault,
        } = event;
        
        // Use the values to avoid drop error
        sui::object::delete(id);
        // Destroy vectors (they may not be empty in tests)
        vector::destroy!(participants, |_x| ());
        vector::destroy!(attendees, |_x| ());
        // Send vault balance to organizer
        let coin = coin::from_balance(vault, &mut sui::tx_context::dummy());
        sui::transfer::public_transfer(coin, organizer);
    }
}
