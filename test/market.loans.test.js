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
    market = await Market.deploy(
      await dex.getAddress(),
      await nft.getAddress()
    );
    await market.waitForDeployment();

    await owner.sendTransaction({
      to: await market.getAddress(),
      value: ethers.parseEther("10"),
    });
  });

  async function createFundedNftLoan(duration = 3600) {
    await nft.connect(borrower).mint("ipfs://loan");
    await nft.connect(borrower).approve(await market.getAddress(), 0);

    await market
      .connect(borrower)
      .requestNFTLoan(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        500,
        duration
      );

    await dex.connect(lender).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(lender)
      .approve(await market.getAddress(), ethers.parseEther("100"));

    await market
      .connect(lender)
      .fundNFTLoan(0, ethers.parseEther("100"));
  }

  it("Cria emprestimo DEX", async function () {
    await dex.connect(borrower).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(borrower)
      .approve(await market.getAddress(), ethers.parseEther("100"));

    await market
      .connect(borrower)
      .borrowETHWithDEX(ethers.parseEther("100"));

    const loan = await market.dexLoans(borrower.address);

    expect(loan.active).to.equal(true);
    expect(await market.pendingETHWithdrawals(borrower.address))
      .to.equal(loan.borrowedETH);
  });

  it("Repay devolve colateral DEX", async function () {
    await dex.connect(borrower).buyDEX({
      value: ethers.parseEther("1"),
    });

    await dex
      .connect(borrower)
      .approve(await market.getAddress(), ethers.parseEther("100"));

    await market
      .connect(borrower)
      .borrowETHWithDEX(ethers.parseEther("100"));

    const loan = await market.dexLoans(borrower.address);
    const interest = (loan.borrowedETH * 500n) / 10000n;

    await market.connect(borrower).repayDEXLoan({
      value: loan.borrowedETH + interest,
    });

    const updated = await market.dexLoans(borrower.address);

    expect(updated.active).to.equal(false);

    // Borrower volta a ter os 1000 DEX que comprou inicialmente
    const dexBalance = await dex.balanceOf(borrower.address);
    expect(dexBalance).to.equal(ethers.parseEther("1000"));
  });

  it("Cria NFT loan", async function () {
    await nft.connect(borrower).mint("ipfs://loan");
    await nft.connect(borrower).approve(await market.getAddress(), 0);

    await market
      .connect(borrower)
      .requestNFTLoan(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        500,
        3600
      );

    const loan = await market.nftLoans(0);

    expect(loan.active).to.equal(true);
    expect(await nft.ownerOf(0)).to.equal(await market.getAddress());
  });

  it("Lender financia NFT loan", async function () {
    await createFundedNftLoan();

    const loan = await market.nftLoans(0);

    expect(loan.funded).to.equal(true);
    expect(loan.lender).to.equal(lender.address);
    expect(await market.pendingETHWithdrawals(borrower.address))
      .to.equal(ethers.parseEther("1"));
  });

  it("Borrower repaga NFT loan e lender recebe metade do juro em saldo pendente", async function () {
    await createFundedNftLoan();

    const totalRepay = ethers.parseEther("1.05");
    const lenderShare = ethers.parseEther("0.025");

    await market.connect(borrower).repayNFTLoan(0, {
      value: totalRepay,
    });

    expect(await nft.ownerOf(0)).to.equal(borrower.address);
    expect(await market.pendingETHWithdrawals(lender.address))
      .to.equal(lenderShare);
  });

  it("Default transfere NFT para o owner do dapp", async function () {
    await createFundedNftLoan(1);

    // Ler o loan para usar a duration correta
    const loan = await market.nftLoans(0);
    const increase = Number(loan.duration) + 1;

    await ethers.provider.send("evm_increaseTime", [increase]);
    await ethers.provider.send("evm_mine", []);

    await market.connect(lender).claimNFTDefault(0);

    expect(await nft.ownerOf(0)).to.equal(owner.address);
  });
});