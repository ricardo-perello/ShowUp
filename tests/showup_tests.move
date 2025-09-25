#[test_only]
module showup::showup_tests;

use showup::showup;
use sui::test_scenario;
use sui::coin;
use sui::sui::SUI;

// Test constants
const ORGANIZER: address = @0x1;
const PARTICIPANT1: address = @0x2;
const PARTICIPANT2: address = @0x3;
const PARTICIPANT3: address = @0x4;
const STAKE_AMOUNT: u64 = 1000;
const END_TIME: u64 = 0; // Set to 0 so event is always "ended" in tests

// Error codes
const E_INSUFFICIENT_STAKE: u64 = 0;
const E_NOT_ORGANIZER: u64 = 1;
const E_EVENT_NOT_ENDED: u64 = 2;
const E_DID_NOT_ATTEND: u64 = 3;

#[test]
fun test_create_event() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event
    let event = showup::create_event(STAKE_AMOUNT, END_TIME, ctx);
    
    // Verify event properties
    assert!(showup::get_organizer(&event) == ORGANIZER, 0);
    assert!(showup::get_stake_amount(&event) == STAKE_AMOUNT, 1);
    assert!(showup::get_end_time(&event) == END_TIME, 2);
    assert!(showup::get_participants_count(&event) == 0, 3);
    assert!(showup::get_attendees_count(&event) == 0, 4);
    assert!(showup::get_vault_balance(&event) == 0, 5);
    
    // Clean up
    showup::destroy_event(event);
    test_scenario::end(scenario);
}

#[test]
fun test_join_event() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event
    let mut event = showup::create_event(STAKE_AMOUNT, END_TIME, ctx);
    
    // Switch to participant context
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create a coin with the correct stake amount
    let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    
    // Join the event
    showup::join_event(&mut event, coin, ctx);
    
    // Verify participant was added
    assert!(showup::get_participants_count(&event) == 1, 0);
    assert!(showup::get_vault_balance(&event) == STAKE_AMOUNT, 1);
    assert!(showup::is_participant(&event, PARTICIPANT1), 2);
    
    // Clean up
    showup::destroy_event(event);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 0)]
fun test_join_event_insufficient_stake() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event
    let mut event = showup::create_event(STAKE_AMOUNT, END_TIME, ctx);
    
    // Switch to participant context
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create a coin with insufficient stake
    let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT - 100, ctx);
    
    // This should fail
    showup::join_event(&mut event, coin, ctx);
    
    // Clean up
    showup::destroy_event(event);
    test_scenario::end(scenario);
}

#[test]
fun test_mark_attended() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event
    let mut event = showup::create_event(STAKE_AMOUNT, END_TIME, ctx);
    
    // Add a participant
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin, ctx);
    
    // Switch back to organizer context
    test_scenario::next_tx(&mut scenario, ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Mark participant as attended
    showup::mark_attended(&mut event, PARTICIPANT1, ctx);
    
    // Verify attendee was added
    assert!(showup::get_attendees_count(&event) == 1, 0);
    assert!(showup::is_attendee(&event, PARTICIPANT1), 1);
    
    // Clean up
    showup::destroy_event(event);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 1)]
fun test_mark_attended_not_organizer() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event
    let mut event = showup::create_event(STAKE_AMOUNT, END_TIME, ctx);
    
    // Add a participant
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin, ctx);
    
    // Try to mark attended as non-organizer (should fail)
    showup::mark_attended(&mut event, PARTICIPANT1, ctx);
    
    // Clean up
    showup::destroy_event(event);
    test_scenario::end(scenario);
}

#[test]
fun test_claim_success() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event
    let mut event = showup::create_event(STAKE_AMOUNT, END_TIME, ctx);
    
    // Add participants
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin1, ctx);
    
    test_scenario::next_tx(&mut scenario, PARTICIPANT2);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin2, ctx);
    
    // Mark both as attended
    test_scenario::next_tx(&mut scenario, ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    showup::mark_attended(&mut event, PARTICIPANT1, ctx);
    showup::mark_attended(&mut event, PARTICIPANT2, ctx);
    
    // Advance time past end time
    // Note: In real tests, we'd advance time, but for now we'll skip this
    // test_scenario::set_epoch(&mut scenario, END_TIME + 1);
    
    // Participant1 claims
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let payout = showup::claim(&mut event, ctx);
    
    // Verify payout amount (total vault / number of attendees)
    let expected_payout = (STAKE_AMOUNT * 2) / 2; // 2 participants, 2 attendees
    assert!(coin::value(&payout) == expected_payout, 0);
    
    // Clean up - transfer coin to avoid drop error
    sui::transfer::public_transfer(payout, PARTICIPANT1);
    showup::destroy_event(event);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 2)]
fun test_claim_event_not_ended() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event with future end time
    let mut event = showup::create_event(STAKE_AMOUNT, 1000, ctx);
    
    // Add participant and mark as attended
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin, ctx);
    
    test_scenario::next_tx(&mut scenario, ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    showup::mark_attended(&mut event, PARTICIPANT1, ctx);
    
    // Try to claim before event ends (should fail)
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let _payout = showup::claim(&mut event, ctx);
    // This line won't execute due to expected failure, but needed for linter
    sui::transfer::public_transfer(_payout, PARTICIPANT1);
    
    // Clean up
    showup::destroy_event(event);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 3)]
fun test_claim_did_not_attend() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event
    let mut event = showup::create_event(STAKE_AMOUNT, END_TIME, ctx);
    
    // Add participant but don't mark as attended
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin, ctx);
    
    // Advance time past end time
    // Note: In real tests, we'd advance time, but for now we'll skip this
    // test_scenario::set_epoch(&mut scenario, END_TIME + 1);
    
    // Try to claim without attending (should fail)
    let _payout = showup::claim(&mut event, ctx);
    // This line won't execute due to expected failure, but needed for linter
    sui::transfer::public_transfer(_payout, PARTICIPANT1);
    
    // Clean up
    showup::destroy_event(event);
    test_scenario::end(scenario);
}

#[test]
fun test_no_show_penalty() {
    let mut scenario = test_scenario::begin(ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create an event
    let mut event = showup::create_event(STAKE_AMOUNT, END_TIME, ctx);
    
    // Add 3 participants
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin1 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin1, ctx);
    
    test_scenario::next_tx(&mut scenario, PARTICIPANT2);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin2 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin2, ctx);
    
    test_scenario::next_tx(&mut scenario, PARTICIPANT3);
    let ctx = test_scenario::ctx(&mut scenario);
    let coin3 = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ctx);
    showup::join_event(&mut event, coin3, ctx);
    
    // Only mark 2 as attended (1 no-show)
    test_scenario::next_tx(&mut scenario, ORGANIZER);
    let ctx = test_scenario::ctx(&mut scenario);
    showup::mark_attended(&mut event, PARTICIPANT1, ctx);
    showup::mark_attended(&mut event, PARTICIPANT2, ctx);
    
    // Advance time past end time
    // Note: In real tests, we'd advance time, but for now we'll skip this
    // test_scenario::set_epoch(&mut scenario, END_TIME + 1);
    
    // Participant1 claims (should get more than their stake due to no-show penalty)
    test_scenario::next_tx(&mut scenario, PARTICIPANT1);
    let ctx = test_scenario::ctx(&mut scenario);
    let payout = showup::claim(&mut event, ctx);
    
    // Verify payout includes no-show penalty
    // Total vault: 3000, Attendees: 2, Expected payout per attendee: 1500
    let expected_payout = (STAKE_AMOUNT * 3) / 2;
    assert!(coin::value(&payout) == expected_payout, 0);
    
    // Clean up - transfer coin to avoid drop error
    sui::transfer::public_transfer(payout, PARTICIPANT1);
    showup::destroy_event(event);
    test_scenario::end(scenario);
}
