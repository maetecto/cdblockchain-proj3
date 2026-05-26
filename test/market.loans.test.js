import { expect } from "chai";
import hre from "hardhat";

describe(
    "DEX Loans",

    function () {

        let ethers;

        let dex;
        let nft;
        let market;

        let owner;
        let borrower;

        beforeEach(
            async function () {

                ethers =

                    (await hre.network
                        .getOrCreate())
                        .ethers;

                [owner,
                    borrower]

                    =

                    await ethers
                        .getSigners();

                const DEX =

                    await ethers
                        .getContractFactory(
                            "DEXToken"
                        );

                dex =

                    await DEX.deploy(

                        1000000,

                        ethers.parseEther(
                            "0.001"
                        )

                    );

                await dex
                    .waitForDeployment();

                const NFT =

                    await ethers
                        .getContractFactory(
                            "PawNFT"
                        );

                nft =
                    await NFT.deploy();

                await nft
                    .waitForDeployment();

                const Market =

                    await ethers
                        .getContractFactory(
                            "DEXNFTMarket"
                        );

                market =

                    await Market.deploy(

                        await dex
                            .getAddress(),

                        await nft
                            .getAddress()

                    );

                await market
                    .waitForDeployment();

                await owner.sendTransaction({

                    to:

                        await market
                            .getAddress(),

                    value:

                        ethers.parseEther(
                            "10"
                        )

                });

            });

        it(
            "Cria emprestimo",

            async function () {

                await dex
                    .connect(
                        borrower
                    )
                    .buyDEX({

                        value:

                            ethers.parseEther(
                                "1"
                            )

                    });

                await dex
                    .connect(
                        borrower
                    )
                    .approve(

                        await market
                            .getAddress(),

                        ethers.parseEther(
                            "100"

                        )

                    );

                await market
                    .connect(
                        borrower
                    )
                    .borrowETHWithDEX(

                        ethers.parseEther(
                            "100"
                        )

                    );

                const loan =

                    await market
                        .dexLoans(

                            borrower
                                .address

                        );

                expect(

                    loan.active

                )

                    .to.equal(
                        true
                    );

            });

        it(
            "Repay devolve colateral",
            async function () {

                await dex
                    .connect(borrower)
                    .buyDEX({

                        value:
                            ethers.parseEther(
                                "1"
                            )

                    });

                await dex
                    .connect(borrower)
                    .approve(

                        await market
                            .getAddress(),

                        ethers.parseEther(
                            "100"
                        )

                    );

                await market
                    .connect(borrower)
                    .borrowETHWithDEX(

                        ethers.parseEther(
                            "100"
                        )

                    );

                const loan =
                    await market
                        .dexLoans(
                            borrower.address
                        );

                const interest =

                    loan.borrowedETH
                    * 500n
                    / 10000n;

                await market
                    .connect(borrower)
                    .repayDEXLoan({

                        value:

                            loan.borrowedETH
                            +
                            interest

                    });

                const updated =

                    await market
                        .dexLoans(

                            borrower.address

                        );

                expect(

                    updated.active

                )

                    .to.equal(
                        false
                    );

            });

        it(
            "Cria NFT loan",
            async function () {

                await nft
                    .connect(borrower)
                    .mint(
                        "ipfs://loan"
                    );

                await nft
                    .connect(borrower)
                    .approve(

                        await market
                            .getAddress(),

                        0

                    );

                await market
                    .connect(borrower)
                    .requestNFTLoan(

                        await nft
                            .getAddress(),

                        0,

                        ethers.parseEther(
                            "1"
                        ),

                        500,

                        3600

                    );

                const loan =

                    await market
                        .nftLoans(0);

                expect(

                    loan.active

                )

                    .to.equal(
                        true
                    );

            }

        );

        it(
            "Lender financia NFT loan",
            async function () {

                await nft
                    .connect(borrower)
                    .mint(
                        "ipfs://loan"
                    );

                await nft
                    .connect(borrower)
                    .approve(

                        await market
                            .getAddress(),

                        0

                    );

                await market
                    .connect(borrower)
                    .requestNFTLoan(

                        await nft
                            .getAddress(),

                        0,

                        ethers.parseEther(
                            "1"
                        ),

                        500,

                        3600

                    );

                await dex
                    .buyDEX({

                        value:
                            ethers.parseEther(
                                "1"
                            )

                    });

                await dex
                    .approve(

                        await market
                            .getAddress(),

                        ethers.parseEther(
                            "100"
                        )

                    );

                await market
                    .fundNFTLoan(

                        0,

                        ethers.parseEther(
                            "100"
                        )

                    );

                const loan =

                    await market
                        .nftLoans(0);

                expect(

                    loan.funded

                )

                    .to.equal(
                        true
                    );

            }

        );

        it(
            "Borrower repaga NFT loan",
            async function () {

                await nft
                    .connect(borrower)
                    .mint(
                        "ipfs://loan"
                    );

                await nft
                    .connect(borrower)
                    .approve(

                        await market
                            .getAddress(),

                        0

                    );

                await market
                    .connect(borrower)
                    .requestNFTLoan(

                        await nft
                            .getAddress(),

                        0,

                        ethers.parseEther(
                            "1"
                        ),

                        500,

                        3600

                    );

                await dex
                    .buyDEX({

                        value:
                            ethers.parseEther(
                                "1"
                            )

                    });

                await dex
                    .approve(

                        await market
                            .getAddress(),

                        ethers.parseEther(
                            "100"
                        )

                    );

                await market
                    .fundNFTLoan(

                        0,

                        ethers.parseEther(
                            "100"
                        )

                    );

                await market
                    .connect(borrower)
                    .repayNFTLoan(

                        0,

                        {

                            value:

                                ethers
                                    .parseEther(
                                        "1.05"
                                    )

                        }

                    );

                expect(

                    await nft
                        .ownerOf(0)

                )

                    .to.equal(
                        borrower.address
                    );

            }

        );

        it(
            "Default transfere NFT para lender",

            async function(){

                await nft
                .connect(borrower)
                .mint(
                    "ipfs://loan"
                );

                await nft
                .connect(borrower)
                .approve(

                    await market
                    .getAddress(),

                    0

                );

                await market
                .connect(borrower)
                .requestNFTLoan(

                    await nft
                    .getAddress(),

                    0,

                    ethers.parseEther(
                        "1"
                    ),

                    500,

                    1

                );

                await dex
                .buyDEX({

                    value:
                    ethers.parseEther(
                        "1"
                    )

                });

                await dex
                .approve(

                    await market
                    .getAddress(),

                    ethers.parseEther(
                        "100"
                    )

                );

                await market
                .fundNFTLoan(

                    0,

                    ethers.parseEther(
                        "100"
                    )

                );

                const connection =
                    await hre.network
                    .connect();

                await connection.provider.send(
                    "evm_increaseTime",
                    [2]
                );

                await connection.provider.send(
                    "evm_mine",
                    []
                );

                await market
                .claimNFTDefault(
                    0
                );

                expect(

                    await nft
                    .ownerOf(0)

                )

                .to.equal(
                    owner.address
                );

            });

    });