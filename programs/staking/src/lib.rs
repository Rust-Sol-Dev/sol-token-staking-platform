use anchor_lang::prelude::*;

mod events;
mod instructions;
mod state;
mod utils;

pub use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, application_idx: u64) -> Result<()> {
        instructions::initialize_handler(ctx, application_idx)
    }

    pub fn withdraw_funds(
        ctx: Context<Withdraw>,
        application_idx: u64,
        state_bump: u8,
        _wallet_bump: u8,
        current_timestamp: u64,
    ) -> Result<()> {
        instructions::withdraw_funds_handler(
            ctx,
            application_idx,
            state_bump,
            _wallet_bump,
            current_timestamp,
        )
    }

    pub fn withdrawal_request(
        ctx: Context<WithdrawalRequest>,
        application_idx: u64,
        state_bump: u8,
        current_timestamp: u64,
    ) -> Result<()> {
        instructions::withdrawal_request_handler(
            ctx,
            application_idx,
            state_bump,
            current_timestamp,
        )
    }

    pub fn deposit_funds_handler(
        ctx: Context<Deposit>,
        application_idx: u64,
        state_bump: u8,
        _wallet_bump: u8,
        amount: u64,
        timestamp: u64,
        unbounding_period: u64,
    ) -> Result<()> {
        instructions::deposit_funds_handler(
            ctx,
            application_idx,
            state_bump,
            _wallet_bump,
            amount,
            timestamp,
            unbounding_period,
        )
    }
}
