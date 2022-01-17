/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
    Keypair,
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    SystemProgram,
    TransactionInstruction,
    Transaction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "mz/fs";
import path from "path";
import * as borsh from "borsh";
import {getPayer, getRpcUrl, createKeypairFromFile} from "./utils";

/* Connection to the Cluster / Network */
let connection: Connection;

/* Keypair associated to the Fees' Payer */
let payerAccount: Keypair;

/* Hello World's Program ID */
let programId: PublicKey;

/* The public Key of the Account it will be saying hello to */
let greetedPubkey: PublicKey;

/* Path to Program Files */
const PROGRAM_PATH = path.resolve(__dirname, "../../dist/program");

/* Path to Program shared Object File which should be deployed on Chain */
/* This File is created when running: `npm run build:program-rust` */
const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, "helloworld.so");

/* Path to the Keypair of the deployed Program */
/* This File is created when running: `solana program deploy dist/program/helloworld.so` */
const PROGRAM_KEYPAIR_PATH = path.join(PROGRAM_PATH, "helloworld-keypair.json");

/* The State of a Greeting Account managed by the Hello World Program */
class GreetingAccount {
    counter = 0;
    message = "";
    constructor(fields: { counter: number, message: string } | undefined = undefined) {
        if (fields) {
            this.counter = fields.counter;
            this.message = fields.message;
        }
    }
}

/* Borsh Schema Definition for Greeting Accounts */
const GreetingSchema = new Map([
    /* Definition refers to Solana Program */
    [GreetingAccount, {
        kind: "struct",
        fields: [["counter", "u32"], ["message", 'String']],
    }]
]);

/* The expected Size of each Greeting Account */
const sampleGreetingAccount = new GreetingAccount();
sampleGreetingAccount.message = "Hello World";
const GREETING_SIZE = borsh.serialize(
    GreetingSchema,
    sampleGreetingAccount
).length;
console.log(`Greeting Account Size is ${GREETING_SIZE}`);

/* Establish a connection to the Cluster */
export async function establishConnection(): Promise<void> {
    const rpcUrl = await getRpcUrl();
    connection = new Connection(rpcUrl, "confirmed");
    const version = await connection.getVersion();
    console.log("Connection to Cluster established:", rpcUrl, version);
}

/* Establish an Account to pay for everything */
export async function establishPayer(): Promise<void> {
    let fees = 0;
    if (!payerAccount) {
        /* Fees for the Entirety of all the Work the Program is going to do */
        const {feeCalculator} = await connection.getRecentBlockhash();
        /* Calculate the Cost to fund the Greeter Account */
        fees += await connection.getMinimumBalanceForRentExemption(GREETING_SIZE);
        /* Calculate the Cost of Sending Transactions */
        /* It is an Estimate, therefore times 100 (Buffer) */
        fees += feeCalculator.lamportsPerSignature * 100;
        payerAccount = await getPayer();
    }

    let lamports = await connection.getBalance(payerAccount.publicKey);
    /* If current Balance is not enough to pay for Fees, request an Airdrop */
    if (lamports < fees) {
        const signature = await connection.requestAirdrop(
            payerAccount.publicKey,
            fees - lamports
        );
        await connection.confirmTransaction(signature);
        lamports = await connection.getBalance(payerAccount.publicKey);
    }
    console.log(`Using Account ${payerAccount.publicKey.toBase58()} containing ${lamports / LAMPORTS_PER_SOL} SOL to pay for Fees`);
}

/* Check if the Hello World BPF Program has been deployed */
/* BPF Loader will load a deployed Program into the Runtime and mark it as read-only and executable */
export async function checkProgram(): Promise<void> {
    /* Read Program ID from Keypair File */
    try {
        const programKeypair = await createKeypairFromFile(PROGRAM_KEYPAIR_PATH);
        programId = programKeypair.publicKey;
    } catch (error) {
        const errMsg = (error as Error).message;
        throw new Error(`Failed to read Program Keypair at "${PROGRAM_KEYPAIR_PATH}" due to Error: ${errMsg}`);
    }

    /* Check if the Program has been deployed */
    const programInfo = await connection.getAccountInfo(programId);
    if (programInfo === null) {
        if (fs.existsSync(PROGRAM_SO_PATH)) {
            throw new Error("Program needs to be deployed");
        } else {
            throw new Error("Program needs to be built and deployed");
        }
    } else if (!programInfo.executable) {
        /* Every Program must be marked as read-only and executable */
        throw new Error("Program is not executable");
    }
    console.log(`Using Program ${programId.toBase58()}`);

    /* Derive the Address (Public Key) of a Greeting Account from the Program so that it's easy to find later */
    const GREETING_SEED = "hello";
    greetedPubkey = await PublicKey.createWithSeed(
        payerAccount.publicKey,
        GREETING_SEED,
        programId
    );

    /* Check if the Greeting Account has already been created */
    const greetedAccount = await connection.getAccountInfo(greetedPubkey);
    if (greetedAccount === null) {
        console.log(`Creating account ${greetedPubkey.toBase58()} to say Hello to`);
        const lamports = await connection.getMinimumBalanceForRentExemption(
            GREETING_SIZE
        );
        const transaction = new Transaction().add(
            /* Only the SystemProgram can create Accounts */
            SystemProgram.createAccountWithSeed({
                /* Payer for this Transaction */
                fromPubkey: payerAccount.publicKey,
                basePubkey: payerAccount.publicKey,
                seed: GREETING_SEED,
                /* The Keypair that would be used */
                newAccountPubkey: greetedPubkey,
                /* Base Amount of Lamports that this Account has in Order to be exempt from Rent */
                lamports,
                /* Amount of Data that is requested on this Account */
                space: GREETING_SIZE,
                /* Program ID that will own the Account and therefore control, access and update it */
                programId
            })
        );
        await sendAndConfirmTransaction(connection, transaction, [payerAccount]);
    }
}

/* Call the Program and say Hello */
export async function sayHello(message: string): Promise<void> {
    console.log(`Saying Hello to ${greetedPubkey.toBase58()}`);
    /* Creating Data Schema to share Data between Client and Program */
    const messageAccount = new GreetingAccount();
    messageAccount.message = message;
    /* Create Transaction Instruction */
    const instruction = new TransactionInstruction({
        keys: [{
            pubkey: greetedPubkey,
            isSigner: false,
            isWritable: true
        }],
        /* That controlling Program */
        programId,
        /* Data to sent */
        data: Buffer.from(borsh.serialize(GreetingSchema, messageAccount))
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [payerAccount]
    );
}

/* Get the Number of Times the greeted Account has been said Hello to from the Program */
export async function reportGreetings(): Promise<void> {
    const accountInfo = await connection.getAccountInfo(greetedPubkey);
    if (accountInfo === null) {
        throw new Error("Error: cannot find the greeted Account");
    }
    /* Getting Greeting Account Object Instance to use statically typed Members (like counter) */
    const greeting: GreetingAccount = borsh.deserialize(
        GreetingSchema,
        GreetingAccount,
        accountInfo.data
    );
    console.log(`${greetedPubkey.toBase58()} has been greeted ${greeting.counter} Time(s)`);
}
