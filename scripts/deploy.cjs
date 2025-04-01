
const hre = require("hardhat");

async function main() {
  console.log("Deploying EventRegistration contract...");

  const EventRegistration = await hre.ethers.getContractFactory("EventRegistration");
  const eventRegistration = await EventRegistration.deploy();

  await eventRegistration.waitForDeployment();
  
  const registrationAddress = await eventRegistration.getAddress();
  console.log("EventRegistration deployed to:", registrationAddress);
  
  console.log("Deploying EventVenue contract...");
  
  const EventVenue = await hre.ethers.getContractFactory("EventVenue");
  const eventVenue = await EventVenue.deploy(registrationAddress);
  
  await eventVenue.waitForDeployment();
  
  const venueAddress = await eventVenue.getAddress();
  console.log("EventVenue deployed to:", venueAddress);
  
  console.log("Contract deployment complete!");
  console.log("You need to copy these addresses and use them in your application:");
  console.log("EventRegistration:", registrationAddress);
  console.log("EventVenue:", venueAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
