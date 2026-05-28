import DEXTokenArtifact from "./abis/DEXToken.json";
import PawNFTArtifact from "./abis/PawNFT.json";
import DEXNFTMarketArtifact from "./abis/DEXNFTMarket.json";

export const DEX = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const NFT = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const MARKET = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export const DEX_ABI = DEXTokenArtifact.abi;
export const NFT_ABI = PawNFTArtifact.abi;
export const MARKET_ABI = DEXNFTMarketArtifact.abi;