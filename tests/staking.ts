import assert from "assert";
import * as anchor from "@project-serum/anchor";
// import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
const spl = require("@solana/spl-token");
import { Staking } from "../target/types/staking";

describe("staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Staking as Program<Staking>;

  let uid = new anchor.BN(10);
  let uidBuffer = uid.toBuffer("le", 8);

  let statePDA, stateBump, escrowPDA, escrowBump;

  const getPDA = async (mint) => {
    [statePDA, stateBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("state"),
        alice.publicKey.toBuffer(),
        mint.toBuffer(),
        uidBuffer,
      ],
      program.programId
    );

    [escrowPDA, escrowBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("wallet"),
        mint.toBuffer(),
        uidBuffer,
      ],
      program.programId
    );

    return [statePDA, stateBump, escrowPDA, escrowBump];

  };

  let alice = anchor.web3.Keypair.generate();

  let wallet = anchor.web3.Keypair.generate();

  let amount = 500000;

  let dep = 100000;

  let depositAmount = new anchor.BN(dep);

  let withdrawAmount = new anchor.BN(50000);

  let tokenMint: { toBuffer: () => Uint8Array | Buffer; };
  let aliceTokenWallet: any;


  it("is Wallet funded", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(alice.publicKey, 10000000000),
      "confirmed"
    );

    let userBalance = await provider.connection.getBalance(alice.publicKey);
    assert.strictEqual(10000000000, userBalance);
  });

  it("creates mint and token account", async () => {
    tokenMint = await spl.createMint(
      provider.connection,
      alice,
      alice.publicKey,
      null,
      6
    );

    aliceTokenWallet = await spl.createAccount(
      provider.connection,
      alice,
      tokenMint,
      alice.publicKey
    );

    await spl.mintTo(
      provider.connection,
      alice,
      tokenMint,
      aliceTokenWallet,
      alice.publicKey,
      amount,
      [alice]
    );

    let _aliceTokenWallet = await spl.getAccount(
      provider.connection,
      aliceTokenWallet
    );

    assert.equal(amount, _aliceTokenWallet.amount);

  });

  it("Is deposited!", async () => {
    // Add your test here.

    [statePDA, stateBump, escrowPDA, escrowBump] = await getPDA(tokenMint);

    let tx1 = await program.methods
      .initialize(uid, stateBump, escrowBump, depositAmount)
      .accounts({
        applicationState: statePDA,
        escrowWalletState: escrowPDA,
        mintOfTokenBeingSent: tokenMint,
        userSending: alice.publicKey,
        walletToWithdrawFrom: aliceTokenWallet,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();

    let _aliceTokenWallet = await spl.getAccount(
      provider.connection,
      aliceTokenWallet
    );
    assert.strictEqual(
      (amount - dep).toString(),
      _aliceTokenWallet.amount.toString()
    );

    let _pdaEscrow = await spl.getAccount(provider.connection, escrowPDA);

    assert.equal(depositAmount, _pdaEscrow.amount.toString());

  });

  it("mint some extra tokens to escrow for paying the reward", async() => {
    await spl.mintTo(
      provider.connection,
      alice,
      tokenMint,
      escrowPDA,
      alice.publicKey,
      amount,
      [alice]
    );

    let escrowPDAWallet = await spl.getAccount(provider.connection, escrowPDA);

    assert.equal(escrowPDAWallet.amount, amount + dep);

  })

  it("is able to withdraw with a reward", async () => {
        

    let timeInYears = 1;
    let timePeriod = new anchor.BN(timeInYears);

    let tx2 = await program.methods
      .withdrawFunds(uid, stateBump, escrowBump, depositAmount, timePeriod)
      .accounts({
        applicationState: statePDA,
        escrowWalletState: escrowPDA,
        mintOfTokenBeingSent: tokenMint,
        userSending: alice.publicKey,
        refundWallet: aliceTokenWallet,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();

    let total_amount = amount + (dep * 10 * timeInYears) / 100;
    let escrow_balance = amount - (dep * 10 * timeInYears) / 100;

    let _pdaEscrow = await spl.getAccount(provider.connection, escrowPDA);
    let _aliceTokenWallet = await spl.getAccount(
      provider.connection,
      aliceTokenWallet
    );
    
    assert.equal(escrow_balance, _pdaEscrow.amount);
    assert.equal(total_amount, _aliceTokenWallet.amount);

  })

});
