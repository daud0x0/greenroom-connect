
const hre = require("hardhat");

async function main() {
  console.log("Deploying EventRegistration contract...");

  const EventRegistration = await hre.ethers.getContractFactory("EventRegistration");
  const eventRegistration = await EventRegistration.deploy();

  await eventRegistration.waitForDeployment();
  
  const address = await eventRegistration.getAddress();
  console.log("EventRegistration deployed to:", address);
  console.log("Copy this address and use it in your application!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
