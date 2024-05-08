use crate::{
    errors::ErrorCode,
    state::State,
    utils::calculate_rewards,
};
use anchor_lang::{
    prelude::*,
    solana_program::{program_error::ProgramError, system_instruction},
};
use anchor_spl::{
    token::{self, Burn, Mint, Token, TokenAccount, Transfer},
    utils::assert_initialized,
};

#[derive(Accounts)]
#[instruction(application_idx: u64, state_bump: u8, wallet_bump: u8)]
pub struct Withdraw<'info> {
    #[account(mut, 
        seeds = [b"state".as_ref(), 
                 user_sending.key().as_ref(), 
                 mint_of_token_being_sent.key().as_ref(), 
                 application_idx.to_le_bytes().as_ref()], 
        bump = state_bump)]
    application_state: Account<'info, State>,
    #[account(
        mut,
        seeds = [b"wallet".as_ref(),
                 mint_of_token_being_sent.key().as_ref(),
                 application_idx.to_le_bytes().as_ref()],
        bump = wallet_bump,
        token::mint = mint_of_token_being_sent,
        token::authority = application_state,
    )]
    escrow_wallet_state: Account<'info, TokenAccount>,
    #[account(mut)]
    user_sending: Signer<'info>,
    mint_of_token_being_sent: Account<'info, Mint>,
    #[account(mut, constraint = refund_wallet.owner == user_sending.key())]
    refund_wallet: Account<'info, TokenAccount>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[access_control(is_not_expired)]
pub fn withdraw_funds_handler(
    ctx: Context<Withdraw>,
    application_idx: u64,
    state_bump: u8,
    _wallet_bump: u8,
    current_timestamp: u64,
) -> Result<()> {
    let state = &mut ctx.accounts.application_state;

    // Ensure withdrawal request has been made
    if state.withdrawal_request_timestamp == 0 {
        return Err(ErrorCode::NoWithdrawalRequest.into());
    }

    // Ensure unbounding period has passed
    let days_since_withdrawal_request =
        (current_timestamp - state.withdrawal_request_timestamp) / (60 * 60 * 24 * 1000);
    if days_since_withdrawal_request < state.unbounding_period_in_days {
        return Err(ErrorCode::UnboundingPeriod.into());
    }

    let total_amount = calculate_rewards(
        state.amount_tokens,
        state.last_deposit_timestamp,
        current_timestamp,
        state.unbounding_period_in_days,
    );

    // Transfer funds from escrow wallet to refund wallet
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow_wallet_state.to_account_info(),
            to: ctx.accounts.refund_wallet.to_account_info(),
            authority: ctx.accounts.application_state.to_account_info(),
        },
        vec![
            b"state".as_ref(),
            ctx.accounts.user_sending.key.as_ref(),
            ctx.accounts.mint_of_token_being_sent.key().as_ref(),
            application_idx.to_le_bytes().as_ref(),
            &[state_bump],
        ],
    );
    token::transfer(cpi_ctx, total_amount)?;

    // Burn tokens from escrow wallet
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.mint_of_token_being_sent.to_account_info(),
            to: ctx.accounts.escrow_wallet_state.to_account_info(),
            authority: ctx.accounts.application_state.to_account_info(),
        },
        vec![
            b"state".as_ref(),
            ctx.accounts.user_sending.key.as_ref(),
            ctx.accounts.mint_of_token_being_sent.key().as_ref(),
            application_idx.to_le_bytes().as_ref(),
            &[state_bump],
        ],
    );
    token::burn(cpi_ctx, total_amount)?;

    // Reset amount_tokens in application state
    state.amount_tokens = 0;

    Ok(())
}

fn is_not_expired(ctx: &Context<Withdraw>) -> Result<()> {
    let current_timestamp = ctx.accounts.rent.context().slot;
    let state = &ctx.accounts.application_state;

    // Ensure withdrawal request has been made
    if state.withdrawal_request_timestamp == 0 {
        return Err(ErrorCode::NoWithdrawalRequest.into());
    }

    // Ensure unbounding period has passed
    let days_since_withdrawal_request =
        (current_timestamp - state.withdrawal_request_timestamp) / (60 * 60 * 24 * 1000);
    if days_since_withdrawal_request < state.unbounding_period_in_days {
        return Err(ErrorCode::UnboundingPeriod.into());
    }

    Ok(())
}