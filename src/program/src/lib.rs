/* Borsh stands for Binary Object Representation Serializer for Hashing */
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey
};

/* Define the Type of State stored in Accounts */
/* Using a Trait (Interface) to define shared Behavior */
#[derive(BorshSerialize, BorshDeserialize, Debug)]
/* Struct `GreetingAccount` inherits the Functions of `BorshSerialize`, `BorshDeserialize` and `Debug` */
pub struct GreetingAccount {
    /* Number of Greetings */
    pub counter: u32,
    pub message: String
}

/* Declare and export the Entrypoint of these Program - it allows to structure the entire Program */
/* Entrypoints allow Programs to call other Programs (like a Microservice Architecture) */
entrypoint!(process_instruction);

/* Entrypoint Implementation */
pub fn process_instruction(
    /* Program ID is where the Account is stored - a Program is stored inside an Account */
    /* Public Key of the Account these Program was loaded into */
    program_id: &Pubkey,
    /* List fo Accounts that these Program claims to have Access */
    accounts: &[AccountInfo],
    /* Set of Parameters that these Program is performed before it is executed its won Logic */
    instruction_data: &[u8]
) -> ProgramResult {
    /* Macros contain an Exclamation Mark in their Name */
    /* Macro that executes a Logging Statement */
    msg!("Hello World Rust Program Entrypoint");

    /* Iterating Accounts is safer than Indexing */
    let accounts_iter = &mut accounts.iter();

    /* Get mutable Reference for the next Account */
    let account = next_account_info(accounts_iter)?;

    /* Check that the Account is not owned by the Program */
    if account.owner != program_id {
        msg!("Greeted Account does not have the correct Program ID");
        return Err(ProgramError::IncorrectProgramId);
    }

    /* Account is owned by the Program in Order to modify its Data */
    msg!("Start to decode Instruction");
    /* Receiving Message from Transaction as Bytes and decode it into a Instance of `GreetingAccount` */
    let message = GreetingAccount::try_from_slice(instruction_data).map_err(|error| {
        msg!("Receiving Message as String (UTF8) failed, {:?}", error);
        ProgramError::InvalidInstructionData;
    })?;
    msg!("Greeting passed ti Program is {:?}", message);

    /* Decode the Byte Array `data` into the concrete Type / Struct `GettingAccount` */
    let mut greeting_account = GreetingAccount::try_from_slice(&account.data.borrow())?;
    /* Increment and store the Number of Times the Account has been greeted */
    greeting_account.counter += 1;

    //let data = &mut &mut account.data.borrow_mut()[..];
    let data = &mut &mut account.data.borrow_mut();
    msg!("Start saving Instruction into Data");
    data[..instruction_data.len()].copy_from_slice(&instruction_data);

    /* Encode the concrete Type / Struct `GettingAccount` into Byte Array `data` */
    greeting_account.serialize(data)?;

    sol_log_compute_units();
    msg!("Greeted {} Time(s)", greeting_account.counter);
    msg!("Message '{}' was sent", message);

    Ok(())
}

/* Tests */
#[cfg(test)]
mod test {
    use super::*;
    use solana_program::clock::Epoch;
    use std::mem;

    #[test]
    fn test_sanity() {
        let program_id = Pubkey::default();
        let key = Pubkey::default();
        let mut lamports = 0;
        let mut data = vec![0; mem::size_of::<u32>()];
        let owner = Pubkey::default();
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            Epoch::default(),
        );
        let instruction_data: Vec<u8> = Vec::new();

        let accounts = vec![account];

        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            0
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            1
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            2
        );
    }
}
