const path = require("path");
const { ethers } = require("ethers");

// RPC da rede local Hardhat
const RPC_URL = "http://127.0.0.1:8545";

// Endereços (os mesmos que usas no frontend)
const DEX = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const NFT = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const MARKET = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

// Importar ABI diretamente dos artifacts do Hardhat
const dexArtifact = require(path.join(
  __dirname,
  "..",
  "..",
  "artifacts",
  "contracts",
  "DEXToken.sol",
  "DEXToken.json"
));
const nftArtifact = require(path.join(
  __dirname,
  "..",
  "..",
  "artifacts",
  "contracts",
  "PawNFT.sol",
  "PawNFT.json"
));
const marketArtifact = require(path.join(
  __dirname,
  "..",
  "..",
  "artifacts",
  "contracts",
  "DEXNFTMarket.sol",
  "DEXNFTMarket.json"
));

const provider = new ethers.JsonRpcProvider(RPC_URL);

const dexContract = new ethers.Contract(DEX, dexArtifact.abi, provider);
const nftContract = new ethers.Contract(NFT, nftArtifact.abi, provider);
const marketContract = new ethers.Contract(MARKET, marketArtifact.abi, provider);

module.exports = {
  provider,
  dexContract,
  nftContract,
  marketContract,
  DEX,
  NFT,
  MARKET,
};