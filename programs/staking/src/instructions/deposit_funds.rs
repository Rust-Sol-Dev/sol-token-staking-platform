use crate::state::State;
use crate::utils::calculate_rewards;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(application_idx: u64, state_bump: u8, wallet_bump: u8)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"state".as_ref(), user_sending.key().as_ref(), mint_of_token_being_sent.key().as_ref(), application_idx.to_le_bytes().as_ref()],
        bump = state_bump
    )]
    application_state: Account<'info, State>,
    #[account(
        mut,
        seeds = [b"wallet".as_ref(), mint_of_token_being_sent.key().as_ref(), application_idx.to_le_bytes().as_ref()],
        bump = wallet_bump,
        token::mint = mint_of_token_being_sent,
        token::authority = application_state,
    )]
    escrow_wallet_state: Account<'info, TokenAccount>,
    #[account(signer)]
    user_sending: AccountInfo<'info>,
    mint_of_token_being_sent: Account<'info, Mint>,
    #[account(
        mut,
        constraint = wallet_to_withdraw_from.owner == *user_sending.key(),
        constraint = wallet_to_withdraw_from.mint == mint_of_token_being_sent.key()
    )]
    wallet_to_withdraw_from: Account<'info, TokenAccount>,
    system_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

pub fn deposit_funds_handler(
    ctx: Context<Deposit>,
    application_idx: u64,
    state_bump: u8,
    wallet_bump: u8,
    amount: u64,
    timestamp: u64,
    unbounding_period: u64,
) -> Result<()> {
    let state = &mut ctx.accounts.application_state;
    state.idx = application_idx;
    state.user_sending = *ctx.accounts.user_sending.key();
    state.mint_of_token_being_sent = *ctx.accounts.mint_of_token_being_sent.key();
    state.escrow_wallet = *ctx.accounts.escrow_wallet_state.to_account_info().key;
    state.unbounding_period_in_days = unbounding_period;

    let mut amount_with_rewards = amount;
    if state.amount_tokens != 0 {
        amount_with_rewards += calculate_rewards(
            state.amount_tokens,
            state.last_deposit_timestamp,
            timestamp,
            0,
        );
    }
    state.amount_tokens = amount_with_rewards;
    state.last_deposit_timestamp = timestamp;

    msg!("Initialized new Safe Transfer instance for {}", amount);

    // Transfer tokens from user's wallet to the escrow wallet.
    token::transfer(
        ctx.accounts.token_program.clone(),
        &Transfer {
            from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
            to: ctx.accounts.escrow_wallet_state.to_account_info(),
            authority: ctx.accounts.user_sending.clone(),
        },
        amount,
    )?;

    Ok(())
}