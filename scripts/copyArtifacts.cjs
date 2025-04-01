
const fs = require('fs');
const path = require('path');

// Paths
const artifactsDir = path.join(__dirname, '../artifacts/contracts');
const publicArtifactsDir = path.join(__dirname, '../public/artifacts/contracts');

// Create the directory structure if it doesn't exist
function ensureDirectoryExistence(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Copy a contract artifact
function copyContractArtifact(contractName) {
  const contractDir = path.join(artifactsDir, `${contractName}.sol`);
  const targetDir = path.join(publicArtifactsDir, `${contractName}.sol`);
  ensureDirectoryExistence(targetDir);

  // Copy the main contract artifact
  const artifactFile = path.join(contractDir, `${contractName}.json`);
  const targetFile = path.join(targetDir, `${contractName}.json`);

  if (!fs.existsSync(artifactFile)) {
    console.error(`Contract artifact for ${contractName} doesn't exist. Run 'npx hardhat compile' first.`);
    return false;
  }

  fs.copyFileSync(artifactFile, targetFile);
  console.log(`Copied ${artifactFile} to ${targetFile}`);
  return true;
}

// Copy the artifacts to the public folder
function copyArtifacts() {
  try {
    if (!fs.existsSync(artifactsDir)) {
      console.error("Artifacts directory doesn't exist. Run 'npx hardhat compile' first.");
      process.exit(1);
    }

    ensureDirectoryExistence(publicArtifactsDir);

    // Copy contract artifacts
    const success1 = copyContractArtifact('EventRegistration');
    const success2 = copyContractArtifact('EventVenue');
    
    if (!success1 || !success2) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error copying artifacts:', error);
    process.exit(1);
  }
}

copyArtifacts();
console.log('Contract artifacts copied to public folder successfully!');
