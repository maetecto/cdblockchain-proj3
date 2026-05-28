import { expect } from "chai";
import hre from "hardhat";

describe("NFT Marketplace", function () {
  let ethers;
  let nft;
  let dex;
  let market;

  let owner;
  let seller;
  let buyer;

  beforeEach(async function () {
    ethers = (await hre.network.getOrCreate()).ethers;
    [owner, seller, buyer] = await ethers.getSigners();

    const DEX = await ethers.getContractFactory("DEXToken");
    dex = await DEX.deploy(1000000, ethers.parseEther("0.001"));
    await dex.waitForDeployment();

    const NFT = await ethers.getContractFactory("PawNFT");
    nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Market = await ethers.getContractFactory("DEXNFTMarket");
    market = await Market.deploy(await dex.getAddress(), await nft.getAddress());
    await market.waitForDeployment();
  });

  it("Owner NFT consegue listar sem transferir posse para o market", async function () {
    await nft.connect(seller).mint("ipfs://paw");
    await nft.connect(seller).approve(await market.getAddress(), 0);

    await market
      .connect(seller)
      .listNFT(await nft.getAddress(), 0, ethers.parseEther("1"), false);

    const listing = await market.listings(0);

    expect(listing.active).to.equal(true);
    expect(await nft.ownerOf(0)).to.equal(seller.address);
  });

  it("Compra NFT com ETH e cobra fee de 5% ao owner", async function () {
    await nft.connect(seller).mint("ipfs://paw");
    await nft.connect(seller).approve(await market.getAddress(), 0);

    await market
      .connect(seller)
      .listNFT(await nft.getAddress(), 0, ethers.parseEther("1"), false);

    const ownerBefore = await ethers.provider.getBalance(owner.address);
    const sellerBefore = await ethers.provider.getBalance(seller.address);

    const tx = await market.connect(buyer).buyNFT(0, {
      value: ethers.parseEther("1"),
    });
    await tx.wait();

    const ownerAfter = await ethers.provider.getBalance(owner.address);
    const sellerAfter = await ethers.provider.getBalance(seller.address);

    expect(await nft.ownerOf(0)).to.equal(buyer.address);
    expect(sellerAfter - sellerBefore).to.equal(ethers.parseEther("0.95"));
    expect(ownerAfter - ownerBefore).to.equal(ethers.parseEther("0.05"));
  });

  it("Compra NFT com DEX e cobra fee de 5% ao owner", async function () {
    await nft.connect(seller).mint("ipfs://paw");
    await nft.connect(seller).approve(await market.getAddress(), 0);

    await market
      .connect(seller)
      .listNFT(await nft.getAddress(), 0, ethers.parseEther("50"), true);

    await dex.connect(buyer).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(buyer)
      .approve(await market.getAddress(), ethers.parseEther("50"));

    const sellerBefore = await dex.balanceOf(seller.address);
    const ownerBefore = await dex.balanceOf(owner.address);

    await market.connect(buyer).buyNFT(0);

    const sellerAfter = await dex.balanceOf(seller.address);
    const ownerAfter = await dex.balanceOf(owner.address);

    expect(await nft.ownerOf(0)).to.equal(buyer.address);
    expect(sellerAfter - sellerBefore).to.equal(ethers.parseEther("47.5"));
    expect(ownerAfter - ownerBefore).to.equal(ethers.parseEther("2.5"));
  });
});