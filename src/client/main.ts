import {
    establishConnection,
    establishPayer,
    checkProgram,
    sayHello,
    reportGreetings,
} from "./hello_world";

async function main() {
    console.log("Let's say hello to a Solana Account");

    /* Establish Connection to the Cluster */
    await establishConnection();

    /* Determine who pays for the Fees */
    await establishPayer();

    /* Check if the Program has been deployed */
    await checkProgram();

    /* Say hello to an Account */
    await sayHello("Hello World");

    /* Find out how many times that Account has been greeted */
    await reportGreetings();

    console.log("Success");
}

main().then(
    () => process.exit(),
    error => {
        console.error(error);
        process.exit(-1);
    }
);
