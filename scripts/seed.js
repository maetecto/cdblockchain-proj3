import "dotenv/config";
import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect();
  const ethers = connection.ethers;

  const [owner, user1, user2] = await ethers.getSigners();

  const dexAddress = process.env.DEX_ADDRESS;
  const nftAddress = process.env.NFT_ADDRESS;
  const marketAddress = process.env.MARKET_ADDRESS;

  const dex = await ethers.getContractAt("DEXToken", dexAddress);
  const nft = await ethers.getContractAt("PawNFT", nftAddress);
  const market = await ethers.getContractAt("DEXNFTMarket", marketAddress);

  console.log("Seed iniciar");

  await dex.connect(user1).buyDEX({
    value: ethers.parseEther("1"),
  });
  console.log("User1 comprou DEX");

  await dex.connect(user2).buyDEX({
    value: ethers.parseEther("1"),
  });
  console.log("User2 comprou DEX");

  await nft.connect(user1).mint("ipfs://nft1");
  await nft.connect(user1).mint("ipfs://nft2");
  console.log("NFTs criados");

  await nft.connect(user1).approve(marketAddress, 0);
  await market
    .connect(user1)
    .listNFT(nftAddress, 0, ethers.parseEther("1"), false);
  console.log("NFT ETH listing criado com fee de owner");

  await nft.connect(user1).approve(marketAddress, 1);
  await market
    .connect(user1)
    .startAuction(nftAddress, 1, ethers.parseEther("1"), false, 3600);
  console.log("Auction criada");

  await nft.connect(user2).mint("ipfs://loan");
  await nft.connect(user2).approve(marketAddress, 2);
  await market
    .connect(user2)
    .requestNFTLoan(nftAddress, 2, ethers.parseEther("1"), 500, 3600);
  console.log("NFT loan criada");

  console.log("Seed completa");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});