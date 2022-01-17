/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import os from "os";
import fs from "mz/fs";
import path from "path";
import yaml from "yaml";
import {Account, Connection, Keypair} from "@solana/web3.js";

/* Sleep Function for asynchronous Mechanism */
export const sleep = (milliseconds: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/* Create */
export const createKeypairAndAirdropLamports = async (
    connection: Connection,
    lamports = 1000_000
): Promise<Account> => {
    /* Account is an Object (Keypair) that represents the Public and Private Key for a Solana Account */
    /* Keypair is used to create a Solana Account that exists on the Cluster / Network */
    const account = new Account();
    const signature = await connection.requestAirdrop(account.publicKey, lamports);
    await connection.confirmTransaction(signature);
    return account;
}

async function getConfig(): Promise<any> {
    /* Path to Solana CLI Config File */
    const CONFIG_FILE_PATH = path.resolve(
        os.homedir(),
        ".config",
        "solana",
        "cli",
        "config.yml",
    );
    const configYml = await fs.readFile(CONFIG_FILE_PATH, {encoding: "utf8"});
    return yaml.parse(configYml);
}

/* Load and parse the Solana CLI Config File to determine which RPC URL to use */
export async function getRpcUrl(): Promise<string> {
    try {
        const config = await getConfig();
        if (!config.json_rpc_url) {
            throw new Error("Missing RPC URL");
        }
        return config.json_rpc_url;
    } catch (error) {
        console.warn("Failed to read RPC URL from CLI Config File, falling back to Localhost");
        return "http://localhost:8899";
    }
}

/* Load and parse the Solana CLI Config File to determine which Payer to use */
export async function getPayer(): Promise<Keypair> {
    try {
        const config = await getConfig();
        if (!config.keypair_path) {
            throw new Error("Missing Keypair Path");
        }
        return await createKeypairFromFile(config.keypair_path);
    } catch (error) {
        console.warn("Failed to create Keypair from CLI Config File, falling back to new random Keypair");
        return Keypair.generate();
    }
}

/* Create a Keypair from a Secret Key stored in File as Bytes' Array */
export async function createKeypairFromFile(
    filePath: string,
): Promise<Keypair> {
    const secretKeyString = await fs.readFile(filePath, {encoding: "utf8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    return Keypair.fromSecretKey(secretKey);
}
