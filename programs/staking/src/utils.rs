use anchor_lang::prelude::*;

pub fn calculate_rewards(
    previous_amount: u64,
    last_deposit_timestamp: u64,
    current_timestamp: u64,
    unbounding_period: u64,
) -> u64 {
    let total_days =
        (current_timestamp - last_deposit_timestamp) / (60 * 60 * 24 * 1000) - unbounding_period;
    let total_amount_with_previous_reward =
        previous_amount + ((previous_amount * total_days * 10) / (365 * 100));
    msg!(&(total_amount_with_previous_reward).to_string());

    total_amount_with_previous_reward
}
