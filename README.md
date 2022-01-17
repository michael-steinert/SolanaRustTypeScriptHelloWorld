# Rust Solana

## Rust

* Rust is installed and managed by the `rustup` Tool
* The Rust Toolchain including `rustc`, `cargo` and `rustup`

# Hello world on Solana

* Setting Logging Information for Solana in `~/.bash_profile` 

```shell
export RUST_LOG=solana_runtime::system_instruction_processor=trace.solana_runtime::message_processor=debug.solana.bpf_loader=debug.solana_rbpf=debug
```

* Showing Logs from Cluster (Network)

```
solana-test-validator --log 
```

* Showing Logs from Program (Smart Contract)

```shell
solana logs -u localhost
```

## Solana

* Data that is stored in the Solana Blockchain is stored in an Account
* These Accounts hold also the corresponding Lamports (Native Cryptocurrency)
* Every Account that has to be accessed, modified and used must be owned by a Program
* To access, modify or use the Account that a Program own the corresponding Keys are necessary

### Rent

* Accounts are charged Rent in Order to exist on the Blockchain to prevent Spam
* To be Rent-exempt a certain minimum Number of Lamports int the Account are required - these Number based on the Complexity of the Program

### Computing Units

* Each Program has a maximum Number of Computing Units available
* Programs will fail if their available Computing Units are exceeded

### Transactions

* Each Transaction consists of:
* an Array of Signatures that contains the Instructions for the Program (like withdraw or deposit Lamports)
* a Message that contains:
  * a Header with Metadata (Like Count of Signatures, read-only Addresses that require or not require Signatures)
  * an Array of Addresses that are accessed from other Programs that are called from the Instructions in the custom Program
  * and a previous Block Hash that the Runtime uses to ensure that the Instructions are not in the Past or Future cause of Proof of History Mechanism
* an Array of Instructions - Instructions are the Commands that will be executed from specific Programs to do various Tasks that are relevant to this Transaction
  * a Transaction consists of:
    * a Program ID that is pointing to the Account Parent that is holding the Program inside its Data,
    * an Array of Accounts which are claimed to be used by the program
    * and Instruction Data that is a Set of Parameters for the Program
