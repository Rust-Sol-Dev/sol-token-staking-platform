import assert from "assert";
import * as anchor from '@project-serum/anchor';
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program } from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
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




  it("Is initialized!", async () => {
    // Add your test here.



    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(alice.publicKey, 10000000000),
      "confirmed"
    );

    const userBalance = await provider.connection.getBalance(alice.publicKey);
    assert.strictEqual(10000000000, userBalance);


    const mintA = await spl.createMint(
      provider.connection,
      alice,
      wallet.publicKey,
      null,
      0,
      spl.TOKEN_PROGRAM_ID
    );

    
  });
});
