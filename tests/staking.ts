import assert from "assert";
import * as anchor from '@project-serum/anchor';
// import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program } from '@project-serum/anchor';
const spl = require("@solana/spl-token");
import { Staking } from '../target/types/staking'; 


describe("staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Staking as Program<Staking>;


  let uid = new anchor.BN(10);
  let uidBuffer = uid.toBuffer();

  let statePDA, stateBump, escrowPDA, escrowBump;

  const getPDA = async(mint) => {

    [statePDA, stateBump] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from("state"), alice.publicKey.toBuffer(), mint.toBuffer(), uidBuffer], program.programId,);

    [escrowPDA, escrowBump] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from("wallet"), alice.publicKey.toBuffer(), mint.toBuffer(), uidBuffer], program.programId,);

  }


  let alice = anchor.web3.Keypair.generate();

  let wallet = anchor.web3.Keypair.generate();

  // const TokenInstructions = require("@project-serum/serum").TokenInstructions;


  // const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  //   TokenInstructions.TOKEN_PROGRAM_ID.toString()
  // );

  it("Is initialized!", async () => {
    // Add your test here.


    let amount = 500000;

    let depositAmount = new anchor.BN(100000);

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(alice.publicKey, 10000000000),
      "confirmed"
    );

    let userBalance = await provider.connection.getBalance(alice.publicKey);
    // console.log(userBalance)
    assert.strictEqual(10000000000, userBalance);


    let mint = await spl.createMint(
      provider.connection,
      alice,
      alice.publicKey,
      null,
      6,
      // null,
      // TOKEN_PROGRAM_ID
    );

    // userBalance = await provider.connection.getBalance(alice.publicKey);  
    // console.log(userBalance);

    const aliceTokenWallet = await spl.createAccount(provider.connection, alice, mint, alice.publicKey);
    
    // userBalance = await provider.connection.getBalance(alice.publicKey);  
    // console.log(userBalance);


    await spl.mintTo(provider.connection, alice, mint, aliceTokenWallet, alice.publicKey,amount,[alice]);

    // let _aliceTokenWallet = await spl.getAccount(provider.connection ,aliceTokenWallet);

    // console.log(_aliceTokenWallet.amount.toString());

    // userBalance = await provider.connection.getBalance(alice.publicKey);  
    // console.log(userBalance);

    const {SystemProgram} = anchor.web3;


    [statePDA, stateBump] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from("state"), alice.publicKey.toBuffer(), mint.toBuffer(), uidBuffer], program.programId,);

    [escrowPDA, escrowBump] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from("wallet"), alice.publicKey.toBuffer(), mint.toBuffer(), uidBuffer], program.programId,);

    console.log(spl.TOKEN_PROGRAM_ID, anchor.web3.SYSVAR_RENT_PUBKEY, SystemProgram.programId)

    const tx = await program.methods.initialize(uid, stateBump, escrowBump, depositAmount).accounts({
      applicationState: statePDA,
      escrowWalletState: escrowPDA,
      mintOfTokenBeingSent: mint,
      userSending: alice.publicKey,
      walletToWithdrawFrom: aliceTokenWallet,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
    }).signers([alice]).rpc();


    console.log(tx)

    // const tx = await programAsd.methods.initialize()
    //   .accounts({
    //     storedData: storedData,
    //     signer: keyPair.publicKey,
    //     systemProgram: anchor.web3.SystemProgram.programId,
    //   }).signers([keyPair]).rpc();
    
  });
});