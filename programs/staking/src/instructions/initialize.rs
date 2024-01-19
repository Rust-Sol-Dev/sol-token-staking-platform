use crate::state::State;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(application_idx: u64)]
pub struct Initialize<'info> {
    #[account(init, payer = user_sending,
            seeds = [b"state".as_ref(),
                     user_sending.key().as_ref(),
                     mint_of_token_being_sent.key().as_ref(),
                     application_idx.to_le_bytes().as_ref()],
            bump,space = 800
        )]
    application_state: Account<'info, State>,
    #[account(init, payer = user_sending,
            seeds = [b"wallet".as_ref(),
                    mint_of_token_being_sent.key().as_ref(),
                    application_idx.to_le_bytes().as_ref()],
            bump,
            token::mint=mint_of_token_being_sent,
            token::authority=application_state,
        )]
    escrow_wallet_state: Account<'info, TokenAccount>,
    #[account(mut)]
    user_sending: Signer<'info>,
    mint_of_token_being_sent: Account<'info, Mint>,
    #[account(
            mut,
            constraint=wallet_to_withdraw_from.owner == user_sending.key(),
            constraint=wallet_to_withdraw_from.mint == mint_of_token_being_sent.key()
        )]
    wallet_to_withdraw_from: Account<'info, TokenAccount>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

pub fn initialize_handler(ctx: Context<Initialize>, application_idx: u64) -> Result<()> {
    let state = &mut ctx.accounts.application_state;
    state.idx = application_idx;
    msg!("Initialized the PDA");

    Ok(())
}
