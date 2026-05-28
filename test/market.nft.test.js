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
    dex = await DEX.deploy(
      1000000,
      ethers.parseEther("0.001")
    );
    await dex.waitForDeployment();

    const NFT = await ethers.getContractFactory("PawNFT");
    nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Market = await ethers.getContractFactory("DEXNFTMarket");
    market = await Market.deploy(
      await dex.getAddress(),
      await nft.getAddress()
    );
    await market.waitForDeployment();
  });

  it(
    "Owner NFT consegue listar transferindo posse para o market",
    async function () {
      await nft
        .connect(seller)
        .mint("ipfs://paw");

      await nft
        .connect(seller)
        .approve(
          await market.getAddress(),
          0
        );

      await market
        .connect(seller)
        .listNFT(
          await nft.getAddress(),
          0,
          ethers.parseEther("1"),
          false
        );

      const listing = await market.listings(0);

      expect(listing.active).to.equal(true);
      expect(listing.seller).to.equal(seller.address);
      expect(await nft.ownerOf(0))
        .to.equal(await market.getAddress());
    }
  );

  it(
    "Compra NFT com ETH e cobra fee de 5% ao owner",
    async function () {
      await nft
        .connect(seller)
        .mint("ipfs://paw");

      await nft
        .connect(seller)
        .approve(
          await market.getAddress(),
          0
        );

      await market
        .connect(seller)
        .listNFT(
          await nft.getAddress(),
          0,
          ethers.parseEther("1"),
          false
        );

      await market
        .connect(buyer)
        .buyNFT(0, {
          value: ethers.parseEther("1"),
        });

      expect(await nft.ownerOf(0))
        .to.equal(buyer.address);

      // seller: 0.95 ETH pendente; owner: 0.05 ETH pendente
      expect(
        await market.pendingETHWithdrawals(seller.address)
      ).to.equal(ethers.parseEther("0.95"));

      expect(
        await market.pendingETHWithdrawals(owner.address)
      ).to.equal(ethers.parseEther("0.05"));
    }
  );

  it(
    "Compra NFT com DEX e cobra fee de 5% ao owner",
    async function () {
      await nft
        .connect(seller)
        .mint("ipfs://paw");

      await nft
        .connect(seller)
        .approve(
          await market.getAddress(),
          0
        );

      await market
        .connect(seller)
        .listNFT(
          await nft.getAddress(),
          0,
          ethers.parseEther("50"),
          true
        );

      await dex
        .connect(buyer)
        .buyDEX({
          value: ethers.parseEther("1"),
        });

      await dex
        .connect(buyer)
        .approve(
          await market.getAddress(),
          ethers.parseEther("50")
        );

      const sellerBefore = await dex.balanceOf(seller.address);
      const ownerBefore = await dex.balanceOf(owner.address);

      await market
        .connect(buyer)
        .buyNFT(0);

      const sellerAfter = await dex.balanceOf(seller.address);
      const ownerAfter = await dex.balanceOf(owner.address);

      expect(await nft.ownerOf(0))
        .to.equal(buyer.address);

      // Seller recebe 95% de 50 = 47.5 DEX
      expect(
        sellerAfter - sellerBefore
      ).to.equal(ethers.parseEther("47.5"));

      // Owner recebe 5% de 50 = 2.5 DEX
      expect(
        ownerAfter - ownerBefore
      ).to.equal(ethers.parseEther("2.5"));
    }
  );
});