
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

// Copy the artifacts to the public folder
function copyArtifacts() {
  try {
    if (!fs.existsSync(artifactsDir)) {
      console.error("Artifacts directory doesn't exist. Run 'npx hardhat compile' first.");
      process.exit(1);
    }

    ensureDirectoryExistence(publicArtifactsDir);

    // Copy EventRegistration artifacts
    const contractDir = path.join(artifactsDir, 'EventRegistration.sol');
    const targetDir = path.join(publicArtifactsDir, 'EventRegistration.sol');
    ensureDirectoryExistence(targetDir);

    // Copy the main contract artifact
    const artifactFile = path.join(contractDir, 'EventRegistration.json');
    const targetFile = path.join(targetDir, 'EventRegistration.json');

    if (!fs.existsSync(artifactFile)) {
      console.error("Contract artifact doesn't exist. Run 'npx hardhat compile' first.");
      process.exit(1);
    }

    fs.copyFileSync(artifactFile, targetFile);
    console.log(`Copied ${artifactFile} to ${targetFile}`);
  } catch (error) {
    console.error('Error copying artifacts:', error);
    process.exit(1);
  }
}

copyArtifacts();
console.log('Contract artifacts copied to public folder successfully!');
