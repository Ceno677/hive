use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer},
    metadata::{self, CreateMetadataAccountsV3, CreateMasterEditionV3, VerifyCollection, VerifySizedCollectionItem, Metadata,
        mpl_token_metadata::types::{DataV2, Collection}},
};
declare_id!("4SGFNSivie3gNeLqT7jiixbJDznHzN9pgtkHbhkoVHNy");

#[program]
pub mod hive {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, burn_amount: u64, max_per_wallet: u16, base_uri: String) -> Result<()> {
        require!(burn_amount > 0 && max_per_wallet > 0 && max_per_wallet <= 888, HiveError::InvalidAmount);
        require!(base_uri.len() <= 170 && (base_uri.starts_with("https://") || base_uri.starts_with("ipfs://") || base_uri.starts_with("ar://")), HiveError::InvalidMetadata);
        let c = &mut ctx.accounts.config;
        c.authority = ctx.accounts.authority.key();
        c.hmd_mint = ctx.accounts.hmd_mint.key();
        c.collection = ctx.accounts.collection.key();
        c.burn_amount = burn_amount;
        c.max_per_wallet = max_per_wallet;
        c.base_uri = base_uri;
        // Every deployment begins closed. The authority opens minting only after
        // metadata, collection authority and the customer-facing canary pass.
        c.paused = true;
        c.bump = ctx.bumps.config;
        Ok(())
    }
    pub fn set_paused(ctx: Context<Admin>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        Ok(())
    }
    pub fn rotate_authority(ctx: Context<Admin>, next: Pubkey) -> Result<()> {
        require!(next != Pubkey::default(), HiveError::Unauthorized);
        ctx.accounts.config.authority = next;
        Ok(())
    }
    pub fn fund(ctx: Context<Fund>, id: [u8;32], amount: u64, plan_hash: [u8;32], deadline: i64) -> Result<()> {
        require!(!ctx.accounts.config.paused, HiveError::Paused);
        require!(amount > 0, HiveError::InvalidAmount);
        let now = Clock::get()?.unix_timestamp;
        require!(valid_deadline(now,deadline), HiveError::InvalidDeadline);
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.source.to_account_info(), to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        }), amount)?;
        let e = &mut ctx.accounts.escrow;
        e.id = id;
        e.requester = ctx.accounts.payer.key();
        e.mint = ctx.accounts.hmd_mint.key();
        e.funded = amount;
        e.spent = 0;
        e.plan_hash = plan_hash;
        e.deadline = deadline;
        e.bump = ctx.bumps.escrow;
        Ok(())
    }
    pub fn release(ctx: Context<Release>, receipt_id: [u8;32], amount: u64, refund: bool) -> Result<()> {
        // A trusted coordinator attests acceptance. On-chain records do not prove code correctness.
        require!(!ctx.accounts.config.paused || refund, HiveError::Paused);
        require!(amount > 0, HiveError::InvalidAmount);
        let e = &ctx.accounts.escrow;
        if refund { require_keys_eq!(ctx.accounts.beneficiary.key(), e.requester, HiveError::Unauthorized); }
        else { require!(Clock::get()?.unix_timestamp < e.deadline, HiveError::DeadlineExpired); }
        let spent = checked_spend(e.funded, e.spent, amount)?;
        let seeds: &[&[u8]] = &[b"escrow", &e.id, &[e.bump]];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        }, &[seeds]), amount)?;
        ctx.accounts.escrow.spent = spent;
        let receipt = &mut ctx.accounts.receipt;
        receipt.id = receipt_id;
        receipt.escrow = ctx.accounts.escrow.key();
        receipt.beneficiary = ctx.accounts.beneficiary.key();
        receipt.amount = amount;
        receipt.refund = refund;
        receipt.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
    pub fn refund_expired(ctx: Context<RefundExpired>, receipt_id: [u8;32]) -> Result<()> {
        let e = &ctx.accounts.escrow;
        require!(Clock::get()?.unix_timestamp >= e.deadline, HiveError::DeadlineNotReached);
        require!(e.spent == 0 && e.funded > 0, HiveError::InsufficientEscrow);
        let amount=e.funded;
        let seeds: &[&[u8]] = &[b"escrow", &e.id, &[e.bump]];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        }, &[seeds]), amount)?;
        ctx.accounts.escrow.spent=amount;
        let receipt=&mut ctx.accounts.receipt;
        receipt.id=receipt_id;receipt.escrow=ctx.accounts.escrow.key();receipt.beneficiary=ctx.accounts.requester.key();
        receipt.amount=amount;receipt.refund=true;receipt.timestamp=Clock::get()?.unix_timestamp;
        Ok(())
    }
    pub fn mint_seat(ctx: Context<MintSeat>, seat_id: u16, request_id: [u8;32]) -> Result<()> {
        let c = &ctx.accounts.config;
        require!(!c.paused, HiveError::Paused);
        require!((1..=888).contains(&seat_id) && c.minted < 888, HiveError::SupplyLimit);
        require!(ctx.accounts.wallet_counter.count < c.max_per_wallet, HiveError::WalletLimit);
        token::burn(CpiContext::new(ctx.accounts.token_program.to_account_info(), Burn {
            mint: ctx.accounts.hmd_mint.to_account_info(), from: ctx.accounts.source.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        }), c.burn_amount)?;
        let seeds: &[&[u8]] = &[b"config", &[c.bump]];
        token::mint_to(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), MintTo {
            mint: ctx.accounts.seat_mint.to_account_info(), to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        }, &[seeds]), 1)?;
        metadata::create_metadata_accounts_v3(CpiContext::new_with_signer(
            ctx.accounts.metadata_program.to_account_info(), CreateMetadataAccountsV3 {
                metadata: ctx.accounts.seat_metadata.to_account_info(), mint: ctx.accounts.seat_mint.to_account_info(),
                mint_authority: ctx.accounts.config.to_account_info(), payer: ctx.accounts.owner.to_account_info(),
                update_authority: ctx.accounts.config.to_account_info(), system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            }, &[seeds]),
            DataV2 { name: format!("hive.md Agent #{:03}", seat_id), symbol: "HMD".into(),
                uri: format!("{}/{}.json", c.base_uri.trim_end_matches('/'), seat_id),
                seller_fee_basis_points: 0, creators: None, collection: Some(Collection { verified: false, key: c.collection }), uses: None },
            false, true, None)?;
        // Collection update authority must be transferred to the config PDA during setup.
        let sized = metadata::mpl_token_metadata::accounts::Metadata::from_bytes(&ctx.accounts.collection_metadata.data.borrow())
            .map_err(|_| error!(HiveError::InvalidMetadata))?.collection_details.is_some();
        if sized {
            metadata::verify_sized_collection_item(CpiContext::new_with_signer(ctx.accounts.metadata_program.to_account_info(), VerifySizedCollectionItem {
                payer: ctx.accounts.owner.to_account_info(), metadata: ctx.accounts.seat_metadata.to_account_info(),
                collection_authority: ctx.accounts.config.to_account_info(), collection_mint: ctx.accounts.collection.to_account_info(),
                collection_metadata: ctx.accounts.collection_metadata.to_account_info(), collection_master_edition: ctx.accounts.collection_edition.to_account_info(),
            }, &[seeds]), None)?;
        } else {
        metadata::verify_collection(CpiContext::new_with_signer(ctx.accounts.metadata_program.to_account_info(), VerifyCollection {
            payer: ctx.accounts.owner.to_account_info(), metadata: ctx.accounts.seat_metadata.to_account_info(),
            collection_authority: ctx.accounts.config.to_account_info(), collection_mint: ctx.accounts.collection.to_account_info(),
            collection_metadata: ctx.accounts.collection_metadata.to_account_info(),
            collection_master_edition: ctx.accounts.collection_edition.to_account_info(),
        }, &[seeds]), None)?;
        }
        metadata::create_master_edition_v3(CpiContext::new_with_signer(ctx.accounts.metadata_program.to_account_info(), CreateMasterEditionV3 {
            edition: ctx.accounts.seat_edition.to_account_info(), mint: ctx.accounts.seat_mint.to_account_info(),
            update_authority: ctx.accounts.config.to_account_info(), mint_authority: ctx.accounts.config.to_account_info(),
            payer: ctx.accounts.owner.to_account_info(), metadata: ctx.accounts.seat_metadata.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(), system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        }, &[seeds]), Some(0))?;
        let r = &mut ctx.accounts.receipt;
        r.seat_id = seat_id;
        r.owner = ctx.accounts.owner.key();
        r.mint = ctx.accounts.seat_mint.key();
        r.request_id = request_id;
        ctx.accounts.config.minted += 1;
        ctx.accounts.wallet_counter.count += 1;
        ctx.accounts.request_receipt.owner = ctx.accounts.owner.key();
        ctx.accounts.request_receipt.request_id = request_id;
        ctx.accounts.request_receipt.seat_id = seat_id;
        Ok(())
    }
    pub fn record(ctx: Context<Record>, task_hash: [u8;32], artifact_hash: [u8;32], builder: Pubkey, verifier: Pubkey, accepted: bool) -> Result<()> {
        require!(builder != verifier, HiveError::SelfVerification);
        let r = &mut ctx.accounts.record;
        r.task_hash = task_hash;
        r.artifact_hash = artifact_hash;
        r.builder = builder;
        r.verifier = verifier;
        r.accepted = accepted;
        r.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

fn checked_spend(funded:u64, spent:u64, amount:u64) -> Result<u64> {
    let total = spent.checked_add(amount).ok_or(HiveError::Overflow)?;
    require!(total <= funded, HiveError::InsufficientEscrow);
    Ok(total)
}
fn valid_deadline(now:i64,deadline:i64)->bool { deadline>now && deadline<=now+7*24*60*60 }

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    #[account(
        seeds = [crate::ID.as_ref()],
        bump,
        seeds::program = anchor_lang::solana_program::bpf_loader_upgradeable::ID,
        constraint = program_data.upgrade_authority_address == Some(authority.key()) @ HiveError::Unauthorized
    )]
    pub program_data: Account<'info, ProgramData>,
    #[account(init, payer=authority, space=8+Config::INIT_SPACE, seeds=[b"config"], bump)]
    pub config: Account<'info, Config>,
    pub hmd_mint: Account<'info, Mint>,
    pub collection: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Admin<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds=[b"config"], bump=config.bump, has_one=authority)]
    pub config: Account<'info, Config>,
}
#[derive(Accounts)]
#[instruction(id:[u8;32])]
pub struct Fund<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    #[account(seeds=[b"config"], bump=config.bump, has_one=hmd_mint)] pub config: Account<'info,Config>,
    pub hmd_mint: Account<'info,Mint>,
    #[account(init, payer=payer, space=8+Escrow::INIT_SPACE, seeds=[b"escrow",id.as_ref()], bump)]
    pub escrow: Account<'info,Escrow>,
    #[account(init, payer=payer, associated_token::mint=hmd_mint, associated_token::authority=escrow)]
    pub vault: Account<'info,TokenAccount>,
    #[account(mut, token::mint=hmd_mint, token::authority=payer)] pub source: Account<'info,TokenAccount>,
    pub token_program: Program<'info,Token>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub system_program: Program<'info,System>,
}
#[derive(Accounts)]
#[instruction(receipt_id:[u8;32])]
pub struct Release<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    #[account(seeds=[b"config"], bump=config.bump, has_one=authority, has_one=hmd_mint)]
    pub config: Account<'info,Config>,
    #[account(mut, seeds=[b"escrow",escrow.id.as_ref()], bump=escrow.bump, constraint=escrow.mint==hmd_mint.key())]
    pub escrow: Account<'info,Escrow>,
    pub hmd_mint: Account<'info,Mint>,
    #[account(mut, associated_token::mint=hmd_mint, associated_token::authority=escrow)]
    pub vault: Account<'info,TokenAccount>,
    /// CHECK: destination owner only, validated by associated token constraints and refund check.
    pub beneficiary: UncheckedAccount<'info>,
    #[account(init_if_needed, payer=authority, associated_token::mint=hmd_mint, associated_token::authority=beneficiary)]
    pub destination: Account<'info,TokenAccount>,
    #[account(init, payer=authority, space=8+PaymentReceipt::INIT_SPACE, seeds=[b"payment",escrow.key().as_ref(),receipt_id.as_ref()], bump)]
    pub receipt: Account<'info,PaymentReceipt>,
    pub token_program: Program<'info,Token>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub system_program: Program<'info,System>,
}
#[derive(Accounts)]
#[instruction(receipt_id:[u8;32])]
pub struct RefundExpired<'info> {
    #[account(mut, address=escrow.requester)] pub requester: Signer<'info>,
    #[account(mut, seeds=[b"escrow",escrow.id.as_ref()], bump=escrow.bump, constraint=escrow.mint==hmd_mint.key())]
    pub escrow: Account<'info,Escrow>,
    pub hmd_mint: Account<'info,Mint>,
    #[account(mut, associated_token::mint=hmd_mint, associated_token::authority=escrow)] pub vault: Account<'info,TokenAccount>,
    #[account(init_if_needed, payer=requester, associated_token::mint=hmd_mint, associated_token::authority=requester)] pub destination: Account<'info,TokenAccount>,
    #[account(init, payer=requester, space=8+PaymentReceipt::INIT_SPACE, seeds=[b"payment",escrow.key().as_ref(),receipt_id.as_ref()], bump)]
    pub receipt: Account<'info,PaymentReceipt>,
    pub token_program: Program<'info,Token>, pub associated_token_program: Program<'info,AssociatedToken>, pub system_program: Program<'info,System>,
}
#[derive(Accounts)]
#[instruction(seat_id:u16, request_id:[u8;32])]
pub struct MintSeat<'info> {
    #[account(mut)] pub owner: Signer<'info>,
    #[account(mut, seeds=[b"config"], bump=config.bump, has_one=hmd_mint, has_one=collection)]
    pub config: Account<'info,Config>,
    #[account(mut)] pub hmd_mint: Account<'info,Mint>,
    #[account(mut, token::mint=hmd_mint, token::authority=owner)] pub source: Account<'info,TokenAccount>,
    #[account(init, payer=owner, space=8+SeatReceipt::INIT_SPACE, seeds=[b"seat",seat_id.to_le_bytes().as_ref()], bump)]
    pub receipt: Account<'info,SeatReceipt>,
    #[account(init, payer=owner, seeds=[b"seat_mint",seat_id.to_le_bytes().as_ref()], bump, mint::decimals=0, mint::authority=config, mint::freeze_authority=config)]
    pub seat_mint: Account<'info,Mint>,
    #[account(init, payer=owner, associated_token::mint=seat_mint, associated_token::authority=owner)]
    pub destination: Account<'info,TokenAccount>,
    /// CHECK: PDA and ownership validated by the metadata program CPI.
    #[account(mut)] pub seat_metadata: UncheckedAccount<'info>,
    pub collection: Account<'info,Mint>,
    /// CHECK: verified collection metadata is validated by Metaplex CPI.
    #[account(mut)] pub collection_metadata: UncheckedAccount<'info>,
    /// CHECK: verified collection master edition is validated by Metaplex CPI.
    pub collection_edition: UncheckedAccount<'info>,
    #[account(init_if_needed, payer=owner, space=8+WalletCounter::INIT_SPACE, seeds=[b"wallet",owner.key().as_ref()], bump)]
    pub wallet_counter: Account<'info,WalletCounter>,
    pub token_program: Program<'info,Token>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub metadata_program: Program<'info,Metadata>,
    pub system_program: Program<'info,System>,
    pub rent: Sysvar<'info,Rent>,
    #[account(init, payer=owner, space=8+MintRequestReceipt::INIT_SPACE, seeds=[b"mint_request",owner.key().as_ref(),request_id.as_ref()], bump)]
    pub request_receipt: Account<'info,MintRequestReceipt>,
    /// CHECK: NFT master edition PDA validated by Metaplex CPI.
    #[account(mut)] pub seat_edition: UncheckedAccount<'info>,
}
#[derive(Accounts)]
#[instruction(task_hash:[u8;32])]
pub struct Record<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    #[account(seeds=[b"config"], bump=config.bump, has_one=authority)] pub config: Account<'info,Config>,
    #[account(init, payer=authority, space=8+WorkRecord::INIT_SPACE, seeds=[b"record",task_hash.as_ref()], bump)]
    pub record: Account<'info,WorkRecord>,
    pub system_program: Program<'info,System>,
}
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority:Pubkey, pub hmd_mint:Pubkey, pub collection:Pubkey,
    pub burn_amount:u64, pub max_per_wallet:u16, pub minted:u16, pub paused:bool, pub bump:u8,
    #[max_len(170)] pub base_uri:String,
}
#[account]
#[derive(InitSpace)]
pub struct Escrow { pub id:[u8;32], pub requester:Pubkey, pub mint:Pubkey, pub funded:u64, pub spent:u64, pub plan_hash:[u8;32], pub deadline:i64, pub bump:u8 }
#[account]
#[derive(InitSpace)]
pub struct PaymentReceipt {pub id:[u8;32],pub escrow:Pubkey,pub beneficiary:Pubkey,pub amount:u64,pub refund:bool,pub timestamp:i64}
#[account]
#[derive(InitSpace)]
pub struct SeatReceipt {pub seat_id:u16,pub owner:Pubkey,pub mint:Pubkey,pub request_id:[u8;32]}
#[account]
#[derive(InitSpace)]
pub struct WalletCounter {pub count:u16}
#[account]
#[derive(InitSpace)]
pub struct MintRequestReceipt {pub owner:Pubkey,pub request_id:[u8;32],pub seat_id:u16}
#[account]
#[derive(InitSpace)]
pub struct WorkRecord {pub task_hash:[u8;32],pub artifact_hash:[u8;32],pub builder:Pubkey,pub verifier:Pubkey,pub accepted:bool,pub timestamp:i64}
#[error_code]
pub enum HiveError {
    #[msg("Invalid amount or policy")] InvalidAmount,
    #[msg("Unauthorized signer or destination")] Unauthorized,
    #[msg("Protocol paused")] Paused,
    #[msg("Supply limit reached")] SupplyLimit,
    #[msg("Wallet mint limit reached")] WalletLimit,
    #[msg("Invalid immutable metadata location")] InvalidMetadata,
    #[msg("Integer overflow")] Overflow,
    #[msg("Insufficient escrow")] InsufficientEscrow,
    #[msg("Builder cannot verify itself")] SelfVerification,
    #[msg("Invalid delivery deadline")] InvalidDeadline,
    #[msg("Delivery deadline expired")] DeadlineExpired,
    #[msg("Delivery deadline has not been reached")] DeadlineNotReached,
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn spend_conserves_balance(){assert_eq!(checked_spend(100,20,80).unwrap(),100);}
    #[test] fn overspend_rejected(){assert!(checked_spend(100,20,81).is_err());}
    #[test] fn overflow_rejected(){assert!(checked_spend(u64::MAX,u64::MAX,1).is_err());}
    #[test] fn deadline_must_be_future(){assert!(!valid_deadline(100,100));assert!(valid_deadline(100,101));}
    #[test] fn deadline_is_bounded_to_seven_days(){assert!(valid_deadline(100,100+7*24*60*60));assert!(!valid_deadline(100,101+7*24*60*60));}
}
