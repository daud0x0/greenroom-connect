
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  paths: {
    artifacts: './artifacts', // Standard Hardhat path
    sources: "./contracts",
    cache: "./cache",
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    // Add other networks as needed
    // goerli: {
    //   url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
    //   accounts: [process.env.PRIVATE_KEY]
    // }
  }
};
