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
      [Buffer.from("wallet"), mint.toBuffer(), uidBuffer],
      program.programId
    );

    return [statePDA, stateBump, escrowPDA, escrowBump];
  };

  let alice = anchor.web3.Keypair.generate();

  let initialAmount = 1000;

  let firstDeposit = 100;
  let firstDepositInBN = new anchor.BN(firstDeposit);

  let secondDeposit = 200;
  let secondDepositInBN = new anchor.BN(secondDeposit);

  let thirdDeposit = 300;
  let thirdDepositInBN = new anchor.BN(thirdDeposit);

  let unboundingPeriod = 2;
  let unboundingPeriodInBN = new anchor.BN(unboundingPeriod);

  let tokenMint: { toBuffer: () => Uint8Array | Buffer };
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
      initialAmount,
      [alice]
    );

    let _aliceTokenWallet = await spl.getAccount(
      provider.connection,
      aliceTokenWallet
    );

    assert.equal(initialAmount, _aliceTokenWallet.amount);
  });

  it("Is initialized", async () => {
    [statePDA, stateBump, escrowPDA, escrowBump] = await getPDA(tokenMint);

    let tx1 = await program.methods
      .initialize(uid)
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

    let state = await program.account.state.fetch(statePDA);

    // assert.equal(state.idx, uid);
  });

  it("Is deposited!", async () => {
    // Add your test here.

    [statePDA, stateBump, escrowPDA, escrowBump] = await getPDA(tokenMint);

    let timestamp = new Date(2022, 0, 1).getTime(); // The date of deposit which is 01/01/2022



    let tx1 = await program.methods
      .depositFunds(
        uid,
        stateBump,
        escrowBump,
        firstDepositInBN,
        new anchor.BN(timestamp),
        unboundingPeriodInBN
      )
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

    assert.equal(
      (initialAmount - firstDeposit),
      _aliceTokenWallet.amount
    );

    let _pdaEscrow = await spl.getAccount(provider.connection, escrowPDA);

    assert.equal(firstDeposit, _pdaEscrow.amount);

    timestamp = new Date(2022, 6, 1).getTime(); // The date of deposit which is 01/07/2022

    let state = await program.account.state.fetch(statePDA);

    tx1 = await program.methods
      .depositFunds(
        uid,
        stateBump,
        escrowBump,
        secondDepositInBN,
        new anchor.BN(timestamp),
        unboundingPeriodInBN
      )
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

    _aliceTokenWallet = await spl.getAccount(
      provider.connection,
      aliceTokenWallet
    );
    assert.equal(
      (initialAmount - firstDeposit - secondDeposit),
      _aliceTokenWallet.amount
    );

    _pdaEscrow = await spl.getAccount(provider.connection, escrowPDA);


    state = await program.account.state.fetch(statePDA);

    assert.equal(firstDeposit + secondDeposit, _pdaEscrow.amount);

    timestamp = new Date(2023, 0, 1).getTime(); // The date of deposit which is 01/01/2023

    let tx2 = await program.methods
      .depositFunds(
        uid,
        stateBump,
        escrowBump,
        thirdDepositInBN,
        new anchor.BN(timestamp),
        unboundingPeriodInBN
      )
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

      _aliceTokenWallet = await spl.getAccount(
        provider.connection,
        aliceTokenWallet
      );
      assert.equal(
        (initialAmount - firstDeposit - secondDeposit - thirdDeposit),
        _aliceTokenWallet.amount
      );
  
      _pdaEscrow = await spl.getAccount(provider.connection, escrowPDA);
      assert.equal(firstDeposit + secondDeposit + thirdDeposit, _pdaEscrow.amount);
  });

  it("mint some extra tokens to escrow for paying the reward", async() => {
    await spl.mintTo(
      provider.connection,
      alice,
      tokenMint,
      escrowPDA,
      alice.publicKey,
      initialAmount,
      [alice]
    );

    let escrowPDAWallet = await spl.getAccount(provider.connection, escrowPDA);

    assert.equal(escrowPDAWallet.amount, initialAmount + firstDeposit + secondDeposit + thirdDeposit); 

  })

  it("requesting for withdrawal", async() => {

    // calling the withdraw funds function before requesting it. This should fail and return the appropriate error
    try {
      let withdrawalTimestamp = new Date(2023, 2, 2).getTime();
      let tx2 = await program.methods
        .withdrawFunds(uid, stateBump, escrowBump, new anchor.BN(withdrawalTimestamp))
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
        assert.equal(true, false);
    } catch (error) {
      assert.equal(error.error.errorMessage, "You have not requested for withdrawal. You have to request for withdrawal before withdrawing the funds.")
    }


    let withdrawalRequestTimestamp = new Date(2023, 2,1).getTime(); // requesting the withdrawal on 1 Feb 2023

    let tx2 = await program.methods
      .withdrawalRequest(uid, stateBump, new anchor.BN(withdrawalRequestTimestamp))
      .accounts({
        applicationState: statePDA,
        userSending: alice.publicKey,
        mintOfTokenBeingSent: tokenMint,
      })
      .signers([alice])
      .rpc();

    let state = await program.account.state.fetch(statePDA);
    assert.equal(state.withdrawalRequestTimestamp.toNumber(), withdrawalRequestTimestamp);

    // the below code block would try to withdraw funds during the unbounding period(2 days) which should fail
    try {
      let withdrawalTimestamp = new Date(2023, 2, 2).getTime();
      let tx2 = await program.methods
        .withdrawFunds(uid, stateBump, escrowBump, new anchor.BN(withdrawalTimestamp))
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
        assert.equal(true, false);
    } catch (error) {
      assert.equal(error.error.errorMessage, "You are still in unbounding period. Please wait for your unbounding period to get over before withdrawing the funds.")
    }

  })

  it("is able to withdraw with a reward", async () => {

    let withdrawalTimestamp = new Date(2023, 6, 1).getTime();
    let tx2 = await program.methods
      .withdrawFunds(uid, stateBump, escrowBump, new anchor.BN(withdrawalTimestamp))
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

    let firstDepositTimestamp = new Date(2022, 0, 1).getTime(); 
    let secondDepositTimestamp = new Date(2022, 6, 1).getTime();
    let thirdDepositTimestamp = new Date(2023, 0, 1).getTime();

    let totalAmountToBeWithdrawn = 0;

    totalAmountToBeWithdrawn = firstDeposit;

    let days = (secondDepositTimestamp - firstDepositTimestamp)/(60 * 60 * 24 * 1000);
    totalAmountToBeWithdrawn += secondDeposit + Math.floor((firstDeposit * 10 * days) / (100 * 365));

    days = (thirdDepositTimestamp - secondDepositTimestamp)/(60 * 60 * 24 * 1000);
    totalAmountToBeWithdrawn += thirdDeposit +  Math.floor((totalAmountToBeWithdrawn * 10 * days) / (100 * 365));

    days = (withdrawalTimestamp - thirdDepositTimestamp)/(60 * 60 * 24 * 1000);
    totalAmountToBeWithdrawn += Math.floor((totalAmountToBeWithdrawn * 10 * days) / (100 * 365));


    let totalAmountInvested = firstDeposit + secondDeposit + thirdDeposit;
    let totalBalance = initialAmount + totalAmountToBeWithdrawn - totalAmountInvested;
    let escrowBalance = initialAmount + totalAmountInvested - totalAmountToBeWithdrawn;


    let _pdaEscrow = await spl.getAccount(provider.connection, escrowPDA);
    let _aliceTokenWallet = await spl.getAccount(
      provider.connection,
      aliceTokenWallet
    );

    // console.log(totalAmountToBeWithdrawn, totalAmountInvested, amount);

    // console.log(totalBalance, _aliceTokenWallet.amount, escrowBalance, _pdaEscrow.amount);

    assert.equal(escrowBalance, _pdaEscrow.amount);
    assert.equal(totalBalance, _aliceTokenWallet.amount);

  })
});
