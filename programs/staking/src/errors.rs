use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("You are still in unbounding period. Please wait for your unbounding period to get over before withdrawing the funds.")]
    UnboundingPeriod,
    #[msg("You have not requested for withdrawal. You have to request for withdrawal before withdrawing the funds.")]
    NoWithdrawalRequest,
}
