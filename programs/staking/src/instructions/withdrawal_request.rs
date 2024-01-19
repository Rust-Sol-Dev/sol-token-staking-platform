use crate::state::State;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
#[instruction(application_idx: u64, state_bump: u8, wallet_bump: u8)]
pub struct WithdrawalRequest<'info> {
    #[account(
        mut,
        seeds = [b"state".as_ref(),
                 user_sending.key().as_ref(),
                 mint_of_token_being_sent.key().as_ref(),
                 application_idx.to_le_bytes().as_ref()],
        bump = state_bump
    )]
    application_state: Account<'info, State>,
    #[account(mut)]
    user_sending: Signer<'info>,
    mint_of_token_being_sent: Account<'info, Mint>,
}

pub fn withdrawal_request_handler(
    ctx: Context<WithdrawalRequest>,
    _application_idx: u64,
    _state_bump: u8,
    current_timestamp: u64,
) -> Result<()> {
    let state = &mut ctx.accounts.application_state;

    state.withdrawal_request_timestamp = current_timestamp;

    Ok(())
}
