use anchor_lang::prelude::*;

#[account]
pub struct State {
    pub idx: u64,
    pub user_sending: Pubkey,
    pub mint_of_token_being_sent: Pubkey,
    pub escrow_wallet: Pubkey,
    pub amount_tokens: u64,
    pub last_deposit_timestamp: u64,
    pub withdrawal_request_timestamp: u64,
    pub unbounding_period_in_days: u64,
}
