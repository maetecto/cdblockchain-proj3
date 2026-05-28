import { expect } from "chai";
import hre from "hardhat";

describe("DEX Loans", function () {
  let ethers;
  let dex;
  let nft;
  let market;

  let owner;
  let borrower;
  let lender;

  beforeEach(async function () {
    ethers = (await hre.network.getOrCreate()).ethers;
    [owner, borrower, lender] = await ethers.getSigners();

    const DEX = await ethers.getContractFactory("DEXToken");
    dex = await DEX.deploy(1000000, ethers.parseEther("0.001"));
    await dex.waitForDeployment();

    const NFT = await ethers.getContractFactory("PawNFT");
    nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Market = await ethers.getContractFactory("DEXNFTMarket");
    market = await Market.deploy(await dex.getAddress(), await nft.getAddress());
    await market.waitForDeployment();

    await owner.sendTransaction({
      to: await market.getAddress(),
      value: ethers.parseEther("10"),
    });
  });

  it("Cria emprestimo DEX", async function () {
    await dex.connect(borrower).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(borrower)
      .approve(await market.getAddress(), ethers.parseEther("100"));

    await market.connect(borrower).borrowETHWithDEX(ethers.parseEther("100"));

    const loan = await market.dexLoans(borrower.address);
    expect(loan.active).to.equal(true);
  });

  it("Repay devolve colateral DEX", async function () {
    await dex.connect(borrower).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(borrower)
      .approve(await market.getAddress(), ethers.parseEther("100"));

    await market.connect(borrower).borrowETHWithDEX(ethers.parseEther("100"));

    const loan = await market.dexLoans(borrower.address);
    const interest = (loan.borrowedETH * 500n) / 10000n;

    await market.connect(borrower).repayDEXLoan({
      value: loan.borrowedETH + interest,
    });

    const updated = await market.dexLoans(borrower.address);
    expect(updated.active).to.equal(false);
  });

  it("Cria NFT loan", async function () {
    await nft.connect(borrower).mint("ipfs://loan");
    await nft.connect(borrower).approve(await market.getAddress(), 0);

    await market.connect(borrower).requestNFTLoan(
      await nft.getAddress(),
      0,
      ethers.parseEther("1"),
      500,
      3600
    );

    const loan = await market.nftLoans(0);
    expect(loan.active).to.equal(true);
  });

  it("Lender financia NFT loan", async function () {
    await nft.connect(borrower).mint("ipfs://loan");
    await nft.connect(borrower).approve(await market.getAddress(), 0);

    await market.connect(borrower).requestNFTLoan(
      await nft.getAddress(),
      0,
      ethers.parseEther("1"),
      500,
      3600
    );

    await dex.connect(lender).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(lender)
      .approve(await market.getAddress(), ethers.parseEther("100"));

    await market.connect(lender).fundNFTLoan(0, ethers.parseEther("100"));

    const loan = await market.nftLoans(0);
    expect(loan.funded).to.equal(true);
    expect(loan.lender).to.equal(lender.address);
    expect(loan.fundedAt).to.be.gt(0);
  });

  it("Borrower repaga NFT loan e lender recebe metade do juro", async function () {
    await nft.connect(borrower).mint("ipfs://loan");
    await nft.connect(borrower).approve(await market.getAddress(), 0);

    await market.connect(borrower).requestNFTLoan(
      await nft.getAddress(),
      0,
      ethers.parseEther("1"),
      500,
      3600
    );

    await dex.connect(lender).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(lender)
      .approve(await market.getAddress(), ethers.parseEther("100"));

    await market.connect(lender).fundNFTLoan(0, ethers.parseEther("100"));

    const lenderBefore = await ethers.provider.getBalance(lender.address);

    const tx = await market.connect(borrower).repayNFTLoan(0, {
      value: ethers.parseEther("1.05"),
    });
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    const lenderAfter = await ethers.provider.getBalance(lender.address);

    expect(await nft.ownerOf(0)).to.equal(borrower.address);
    expect(lenderAfter - lenderBefore).to.equal(ethers.parseEther("0.025"));
    expect(await dex.balanceOf(lender.address)).to.equal(ethers.parseEther("1000"));
    expect(gasCost).to.be.gte(0n);
  });

  it("Default transfere NFT para o owner do dapp", async function () {
    await nft.connect(borrower).mint("ipfs://loan");
    await nft.connect(borrower).approve(await market.getAddress(), 0);

    await market.connect(borrower).requestNFTLoan(
      await nft.getAddress(),
      0,
      ethers.parseEther("1"),
      500,
      1
    );

    await dex.connect(lender).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(lender)
      .approve(await market.getAddress(), ethers.parseEther("100"));

    await market.connect(lender).fundNFTLoan(0, ethers.parseEther("100"));

    const network = await hre.network.getOrCreate();
    await network.provider.send("evm_increaseTime", [10]);
    await network.provider.send("evm_mine", []);

    await market.connect(owner).claimNFTDefault(0);

    expect(await nft.ownerOf(0)).to.equal(owner.address);
  });
});