#[test_only]
module showup::showup_tests {
    use sui::test_scenario::Self as test_scenario;
    use sui::coin::Self;
    use sui::sui::SUI;
    use sui::clock::Clock;
    use std::string::{Self, String};
    use showup::showup;
    use showup::showup::{
        E_INSUFFICIENT_STAKE,
        E_NOT_ORGANIZER,
        E_EVENT_NOT_ENDED,
        E_DID_NOT_ATTEND,
        E_CAPACITY_EXCEEDED,
        E_ALREADY_CLAIMED,
        E_EVENT_ALREADY_STARTED,
        E_EVENT_NOT_CANCELLED,
        E_NOT_PARTICIPANT,
        E_EVENT_REQUIRES_APPROVAL,
        E_REGISTRATION_ENDED,
        E_REGISTRATION_NOT_STARTED,
        E_ORGANIZER_CANNOT_PARTICIPATE,
    };

    // Test constants
    const ORGANIZER: address = @0x1;
    const PARTICIPANT1: address = @0x2;
    const PARTICIPANT2: address = @0x3;
    const PARTICIPANT3: address = @0x4;
    const STAKE_AMOUNT: u64 = 1000;
    const END_TIME: u64 = 1000; // Set to future time so event is not ended in tests
    const START_TIME: u64 = 100;
    const REGISTRATION_START_TIME: u64 = 0; // Registration starts immediately
    const REGISTRATION_END_TIME: u64 = 90; // Before start time
    const CAPACITY: u64 = 2;
    const EVENT_NAME: vector<u8> = b"Test Event";
    const EVENT_DESCRIPTION: vector<u8> = b"Test Description";
    const EVENT_LOCATION: vector<u8> = b"Test Location";

    // Helper function to create test strings
    fun create_test_string(bytes: vector<u8>): String {
        string::utf8(bytes)
    }

    // Helper function to create and share a Clock object for testing
    fun setup_clock(scenario: &mut test_scenario::Scenario) {
        let clock = sui::clock::create_for_testing(test_scenario::ctx(scenario));
        sui::clock::share_for_testing(clock);
    }

    // Helper function to create an "ended" event for testing
    fun create_ended_event(ctx: &mut sui::tx_context::TxContext): showup::Event {
        showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            0, // End time = 0, current epoch = 0, so 0 >= 0 is true
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        )
    }

    #[test]
    fun test_create_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Verify event properties
        assert!(showup::get_organizer(&event) == ORGANIZER, 0);
        assert!(showup::get_stake_amount(&event) == STAKE_AMOUNT, 1);
        assert!(showup::get_end_time(&event) == END_TIME, 2);
        assert!(showup::get_participants_count(&event) == 0, 3);
        assert!(showup::get_attendees_count(&event) == 0, 4);
        assert!(showup::get_vault_balance(&event) == 0, 5);
        assert!(showup::get_capacity(&event) == CAPACITY, 6);
        assert!(showup::spots_left(&event) == CAPACITY, 7);
        assert!(!showup::is_cancelled(&event), 8);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_REGISTRATION_NOT_STARTED)]
    fun test_join_event_before_registration_starts() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create event with registration starting at time 10
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            10, // Registration starts at time 10
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // public event
            ctx
        );
        
        // Try to join before registration starts (current epoch = 0, registration starts at 10)
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_join_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Create coins for participant
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        
        // Switch to participant context
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify participant was added
        assert!(showup::get_participants_count(&event) == 1, 0);
        assert!(showup::get_vault_balance(&event) == STAKE_AMOUNT, 1);
        assert!(showup::is_participant(&event, PARTICIPANT1), 2);
        assert!(showup::spots_left(&event) == 1, 3);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mark_attended() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Add participant
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Switch back to organizer
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        showup::mark_attended(&mut event, vector[PARTICIPANT1], ctx);
        
        // Verify attendance was marked
        assert!(showup::get_attendees_count(&event) == 1, 0);
        assert!(showup::is_attendee(&event, PARTICIPANT1), 1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_claim_success() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = create_ended_event(ctx);
        
        // Add participant and mark as attended
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::mark_attended(&mut event, vector[PARTICIPANT1], ctx);
        
        // Switch to participant to claim
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Transfer payout to avoid drop error
        sui::transfer::public_transfer(payout, PARTICIPANT1);
        
        // Verify claim was recorded
        assert!(showup::get_claimed_count(&event) == 1, 0);
        assert!(showup::has_claimed(&event, PARTICIPANT1), 1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_INSUFFICIENT_STAKE)]
    fun test_join_event_insufficient_stake() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Create insufficient stake
        let coin = coin::mint_for_testing<SUI>(500, test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_NOT_ORGANIZER)]
    fun test_mark_attended_not_organizer() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::mark_attended(&mut event, vector[PARTICIPANT1], ctx);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mark_attended_batch() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            3, // capacity = 3
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Participant 1 joins
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Participant 2 joins
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Participant 3 joins
        let coin3 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin3, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Switch back to organizer
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Mark multiple participants as attended in batch
        showup::mark_attended(&mut event, vector[PARTICIPANT1, PARTICIPANT2, PARTICIPANT3], ctx);
        
        // Verify all participants were marked as attended
        assert!(showup::get_attendees_count(&event) == 3, 0);
        assert!(showup::is_attendee(&event, PARTICIPANT1), 1);
        assert!(showup::is_attendee(&event, PARTICIPANT2), 2);
        assert!(showup::is_attendee(&event, PARTICIPANT3), 3);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_request_to_join_private_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event (must_request_to_join = true)
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Participant requests to join
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify request was added to pending requests
        assert!(showup::get_pending_requests_count(&event) == 1, 0);
        assert!(showup::get_participants_count(&event) == 0, 1);
        assert!(showup::has_pending_request(&event, PARTICIPANT1), 2);
        assert!(!showup::is_participant(&event, PARTICIPANT1), 3);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_accept_requests_batch() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            3, // capacity = 3
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Participants request to join
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin3 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin3, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify all requests are pending
        assert!(showup::get_pending_requests_count(&event) == 3, 0);
        assert!(showup::get_participants_count(&event) == 0, 1);
        
        // Organizer accepts all requests in batch
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::accept_requests(&mut event, vector[PARTICIPANT1, PARTICIPANT2, PARTICIPANT3], ctx);
        
        // Verify all participants were accepted
        assert!(showup::get_pending_requests_count(&event) == 0, 2);
        assert!(showup::get_participants_count(&event) == 3, 3);
        assert!(showup::is_participant(&event, PARTICIPANT1), 4);
        assert!(showup::is_participant(&event, PARTICIPANT2), 5);
        assert!(showup::is_participant(&event, PARTICIPANT3), 6);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_reject_requests_batch() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Participants request to join
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify requests are pending
        assert!(showup::get_pending_requests_count(&event) == 2, 0);
        assert!(showup::get_participants_count(&event) == 0, 1);
        
        // Organizer rejects all requests in batch
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::reject_requests(&mut event, vector[PARTICIPANT1, PARTICIPANT2], ctx);
        
        // Verify all requests were rejected (removed from pending)
        assert!(showup::get_pending_requests_count(&event) == 0, 2);
        assert!(showup::get_participants_count(&event) == 0, 3);
        assert!(!showup::is_participant(&event, PARTICIPANT1), 4);
        assert!(!showup::is_participant(&event, PARTICIPANT2), 5);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_EVENT_REQUIRES_APPROVAL)]
    fun test_join_private_event_directly() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Try to join directly (should fail)
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_NOT_ORGANIZER)]
    fun test_accept_requests_not_organizer() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Participant requests to join
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Non-organizer tries to accept request (should fail)
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::accept_requests(&mut event, vector[PARTICIPANT1], ctx);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_NOT_ORGANIZER)]
    fun test_reject_requests_not_organizer() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Participant requests to join
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Non-organizer tries to reject request (should fail)
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::reject_requests(&mut event, vector[PARTICIPANT1], ctx);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_CAPACITY_EXCEEDED)]
    fun test_accept_requests_exceeds_capacity() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event with capacity 2
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            2, // capacity = 2
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Participants request to join
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin3 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin3, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify we have 3 pending requests
        assert!(showup::get_pending_requests_count(&event) == 3, 0);
        assert!(showup::get_participants_count(&event) == 0, 1);
        
        // Try to accept all 3 requests when capacity is only 2 (should fail)
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::accept_requests(&mut event, vector[PARTICIPANT1, PARTICIPANT2, PARTICIPANT3], ctx);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_accept_requests_within_capacity() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event with capacity 3
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            3, // capacity = 3
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Participants request to join
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify we have 2 pending requests
        assert!(showup::get_pending_requests_count(&event) == 2, 0);
        assert!(showup::get_participants_count(&event) == 0, 1);
        
        // Accept 2 requests when capacity is 3 (should succeed)
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::accept_requests(&mut event, vector[PARTICIPANT1, PARTICIPANT2], ctx);
        
        // Verify all requests were accepted
        assert!(showup::get_pending_requests_count(&event) == 0, 2);
        assert!(showup::get_participants_count(&event) == 2, 3);
        assert!(showup::is_participant(&event, PARTICIPANT1), 4);
        assert!(showup::is_participant(&event, PARTICIPANT2), 5);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_withdraw_from_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create public event
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Participant joins
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify participant is in the event
        assert!(showup::get_participants_count(&event) == 1, 0);
        assert!(showup::is_participant(&event, PARTICIPANT1), 1);
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);        // Participant withdraws
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::withdraw_from_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify participant is no longer in the event
        assert!(showup::get_participants_count(&event) == 0, 2);
        assert!(!showup::is_participant(&event, PARTICIPANT1), 3);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_claim_no_attendees() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create public event with ended event (end_time = 0, current epoch = 0)
        let mut event = create_ended_event(ctx);
        
        // Participants join
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify participants are in the event
        assert!(showup::get_participants_count(&event) == 2, 0);
        assert!(showup::get_attendees_count(&event) == 0, 1); // No one attended
        
        // Participants claim refund (since no one attended)
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let refund1 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&refund1) == STAKE_AMOUNT, 2);
        sui::transfer::public_transfer(refund1, PARTICIPANT1);
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let refund2 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&refund2) == STAKE_AMOUNT, 3);
        sui::transfer::public_transfer(refund2, PARTICIPANT2);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_claim_pending_stake_after_registration_ended() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event with registration end time in the past
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            true, // must_request_to_join = true for private events
            ctx
        );
        
        // Participant requests to join (before registration ends)
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::request_to_join(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify participant has pending request
        assert!(showup::has_pending_request(&event, PARTICIPANT1), 0);
        assert!(showup::get_pending_vault_balance(&event) == STAKE_AMOUNT, 1);
        
        // Set registration end time to past so participant can claim their stake
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);        showup::set_registration_end_time(&mut event, 0); // Set to past time
        
        // Participant claims their stake back
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let refund = showup::claim_pending_stake(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&refund) == STAKE_AMOUNT, 2);
        sui::transfer::public_transfer(refund, PARTICIPANT1);
        
        // Verify participant no longer has pending request and vault is empty
        assert!(!showup::has_pending_request(&event, PARTICIPANT1), 3);
        assert!(showup::get_pending_vault_balance(&event) == 0, 4);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_total_pot_lazy_initialization_fix() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create event with 3 participants
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            0, // unlimited capacity
            false, // public event
            ctx
        );
        
        // 3 participants join
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin3 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin3, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // One participant withdraws (forfeits stake)
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::withdraw_from_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // End event
        showup::set_end_time(&mut event, 0);
        
        // Verify total pot is 3 * STAKE_AMOUNT (including withdrawn participant's stake)
        let expected_total_pot = 3 * STAKE_AMOUNT;
        
        // First participant claims (should trigger total_pot initialization)
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout1 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        // Should get 1/2 of total pot (3 * STAKE_AMOUNT / 2 remaining participants)
        assert!(coin::value(&payout1) == expected_total_pot / 2, 0);
        sui::transfer::public_transfer(payout1, PARTICIPANT1);
        
        // Second participant claims (should use same total_pot value)
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout2 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        // Should also get 1/2 of total pot (same amount as first participant)
        assert!(coin::value(&payout2) == expected_total_pot / 2, 1);
        sui::transfer::public_transfer(payout2, PARTICIPANT3);
        
        // Verify vault is now empty (no leftover money)
        assert!(showup::get_participant_vault_balance(&event) == 0, 2);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_remainder_distribution_no_attendees() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create event with 3 participants, total pot will be 1000 (not divisible by 3)
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            1000, // stake amount = 1000, so total pot = 3000
            0, // unlimited capacity
            false, // public event
            ctx
        );
        
        // 3 participants join (total pot = 3000)
        let coin1 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin3 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin3, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // End event
        showup::set_end_time(&mut event, 0);
        
        // Expected: 3000 / 3 = 1000 base, remainder = 0
        // All should get exactly 1000
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout1 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&payout1) == 1000, 0);
        sui::transfer::public_transfer(payout1, PARTICIPANT1);
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout2 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&payout2) == 1000, 1);
        sui::transfer::public_transfer(payout2, PARTICIPANT2);
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout3 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&payout3) == 1000, 2);
        sui::transfer::public_transfer(payout3, PARTICIPANT3);
        
        // Verify vault is empty (no remainder left)
        assert!(showup::get_participant_vault_balance(&event) == 0, 3);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_remainder_distribution_with_remainder() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create event with 3 participants, total pot will be 1001 (not divisible by 3)
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            1000, // stake amount = 1000
            0, // unlimited capacity
            false, // public event
            ctx
        );
        
        // 3 participants join, then one withdraws (total pot = 3000, 2 participants remain)
        let coin1 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin3 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin3, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Participant 3 withdraws (forfeits stake, total pot remains 3000, 2 participants remain)
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::withdraw_from_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // End event
        showup::set_end_time(&mut event, 0);
        
        // Expected: 3000 / 2 = 1500 base, remainder = 0
        // Both should get exactly 1500
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout1 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&payout1) == 1500, 0);
        sui::transfer::public_transfer(payout1, PARTICIPANT1);
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout2 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&payout2) == 1500, 1);
        sui::transfer::public_transfer(payout2, PARTICIPANT2);
        
        // Verify vault is empty (no remainder left)
        assert!(showup::get_participant_vault_balance(&event) == 0, 2);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_remainder_distribution_uneven_split() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create event with 5 participants, total pot will be 1003 (not divisible by 5)
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            1000, // stake amount = 1000
            0, // unlimited capacity
            false, // public event
            ctx
        );
        
        // 5 participants join, then 2 withdraw (total pot = 5000, 3 participants remain)
        let coin1 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, @0x4);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, @0x5);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin3 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, @0x6);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin3, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin4 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, @0x7);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin4, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin5 = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, @0x8);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin5, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // 2 participants withdraw (forfeits stake, total pot remains 5000, 3 participants remain)
        test_scenario::next_tx(&mut scenario, @0x7);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::withdraw_from_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        test_scenario::next_tx(&mut scenario, @0x8);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::withdraw_from_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // End event
        showup::set_end_time(&mut event, 0);
        
        // Expected: 5000 / 3 = 1666 base, remainder = 2
        // First 2 claimers get 1667, third gets 1666
        test_scenario::next_tx(&mut scenario, @0x4);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout1 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&payout1) == 1667, 0); // First claimer gets base + 1
        sui::transfer::public_transfer(payout1, @0x4);
        
        test_scenario::next_tx(&mut scenario, @0x5);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout2 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&payout2) == 1667, 1); // Second claimer gets base + 1
        sui::transfer::public_transfer(payout2, @0x5);
        
        test_scenario::next_tx(&mut scenario, @0x6);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout3 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        assert!(coin::value(&payout3) == 1666, 2); // Third claimer gets base amount
        sui::transfer::public_transfer(payout3, @0x6);
        
        // Verify vault is empty (no remainder left)
        assert!(showup::get_participant_vault_balance(&event) == 0, 3);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_ORGANIZER_CANNOT_PARTICIPATE)]
    fun test_organizer_cannot_join_public_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create public event
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // public event
            ctx
        );
        
        // Try to join as organizer (should fail)
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        showup::join_event(&mut event, coin, &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(clock);
        
        // Clean up (this won't be reached due to expected failure, but needed for compilation)
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_ORGANIZER_CANNOT_PARTICIPATE)]
    fun test_organizer_cannot_request_private_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create private event
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            true, // private event
            ctx
        );
        
        // Try to request to join as organizer (should fail)
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        showup::request_to_join(&mut event, coin, &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(clock);
        
        // Clean up (this won't be reached due to expected failure, but needed for compilation)
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_EVENT_NOT_ENDED)]
    fun test_claim_event_not_ended() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create event with future end time
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            2000, // Future end time
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Add participant and mark as attended
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::mark_attended(&mut event, vector[PARTICIPANT1], ctx);
        
        // Try to claim before event ended
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        // Transfer payout to avoid drop error (this line won't execute due to expected failure)
        sui::transfer::public_transfer(payout, PARTICIPANT1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_DID_NOT_ATTEND)]
    fun test_claim_did_not_attend() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = create_ended_event(ctx);
        
        // Add two participants
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Mark only PARTICIPANT1 as attended
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::mark_attended(&mut event, vector[PARTICIPANT1], ctx);
        
        // PARTICIPANT2 tries to claim without being marked as attended
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        // Transfer payout to avoid drop error (this line won't execute due to expected failure)
        sui::transfer::public_transfer(payout, PARTICIPANT2);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_capacity_checking() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Add participants up to capacity
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify capacity is reached
        assert!(showup::get_participants_count(&event) == 2, 0);
        assert!(showup::spots_left(&event) == 0, 1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_CAPACITY_EXCEEDED)]
    fun test_capacity_exceeded() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Fill up capacity
        let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin1, &clock, ctx);
        test_scenario::return_shared(clock);
        
        let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT2);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin2, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Try to exceed capacity
        let coin3 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT3);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin3, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_cancel_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Cancel event (before start time)
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::cancel_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify event is cancelled
        assert!(showup::is_cancelled(&event), 0);
        assert!(showup::get_end_time(&event) == 0, 1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_refund_after_cancellation() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Add participant
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Cancel event
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::cancel_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Participant gets refund
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let ctx = test_scenario::ctx(&mut scenario);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let refund = showup::refund(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Verify refund amount before transferring
        assert!(coin::value(&refund) == STAKE_AMOUNT, 0);
        
        // Transfer refund to avoid drop error
        sui::transfer::public_transfer(refund, PARTICIPANT1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_NOT_ORGANIZER)]
    fun test_cancel_event_not_organizer() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Try to cancel as non-organizer
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::cancel_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_EVENT_ALREADY_STARTED)]
    fun test_cancel_event_after_start() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            0, // Start time in the past
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Try to cancel after start time
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::cancel_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

#[test]
    #[expected_failure(abort_code = E_EVENT_NOT_CANCELLED)]
    fun test_refund_event_not_cancelled() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Add participant
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);        // Try to refund without cancelling
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let refund = showup::refund(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        // Transfer refund to avoid drop error (this line won't execute due to expected failure)
        sui::transfer::public_transfer(refund, PARTICIPANT1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_NOT_PARTICIPANT)]
    fun test_refund_not_participant() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let mut event = showup::create_event_for_testing(
            create_test_string(EVENT_NAME),
            create_test_string(EVENT_DESCRIPTION),
            create_test_string(EVENT_LOCATION),
            START_TIME,
            REGISTRATION_START_TIME,
            REGISTRATION_END_TIME,
            END_TIME,
            STAKE_AMOUNT,
            CAPACITY,
            false, // must_request_to_join = false for public events
            ctx
        );
        
        // Cancel event
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::cancel_event(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        
        // Try to refund as non-participant
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let ctx = test_scenario::ctx(&mut scenario);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let refund = showup::refund(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        // Transfer refund to avoid drop error (this line won't execute due to expected failure)
        sui::transfer::public_transfer(refund, PARTICIPANT1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = E_ALREADY_CLAIMED)]
    fun test_double_claim() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        setup_clock(&mut scenario);
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);        
        let mut event = create_ended_event(ctx);
        
        // Add participant and mark as attended
        let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::join_event(&mut event, coin, &clock, ctx);
        test_scenario::return_shared(clock);
        
        test_scenario::next_tx(&mut scenario, ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);
        showup::mark_attended(&mut event, vector[PARTICIPANT1], ctx);
        
        // First claim
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout1 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        sui::transfer::public_transfer(payout1, PARTICIPANT1);
        
        test_scenario::next_tx(&mut scenario, PARTICIPANT1);        // Try to claim again
        let clock = test_scenario::take_shared<Clock>(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let payout2 = showup::claim(&mut event, &clock, ctx);
        test_scenario::return_shared(clock);
        // Transfer payout to avoid drop error (this line won't execute due to expected failure)
        sui::transfer::public_transfer(payout2, PARTICIPANT1);
        
        // Clean up
        showup::destroy_event(event);
        test_scenario::end(scenario);
    }
}