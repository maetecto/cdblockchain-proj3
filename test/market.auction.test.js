import { expect } from "chai";
import hre from "hardhat";

describe("NFT Auction", function () {

    let ethers;

    let dex;
    let nft;
    let market;

    let owner;
    let seller;
    let bidder1;
    let bidder2;

    beforeEach(async function () {

        ethers =
            (await hre.network
                .getOrCreate())
                .ethers;

        [owner,
         seller,
         bidder1,
         bidder2]

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

    });

    it(
        "Cria leilao",
        async function () {

            await nft
            .connect(seller)
            .mint(
                "ipfs://paw"
            );

            await nft
            .connect(seller)
            .approve(

                await market
                .getAddress(),

                0

            );

            await market
            .connect(seller)
            .startAuction(

                await nft
                .getAddress(),

                0,

                ethers.parseEther(
                    "1"
                ),

                false,

                3600

            );

            const auction =
                await market
                .auctions(0);

            expect(
                auction.active
            )
            .to.equal(
                true
            );

        }
    );

    it(
        "Aceita bid",
        async function () {

            await nft
            .connect(seller)
            .mint(
                "ipfs://paw"
            );

            await nft
            .connect(seller)
            .approve(

                await market
                .getAddress(),

                0

            );

            await market
            .connect(seller)
            .startAuction(

                await nft
                .getAddress(),

                0,

                ethers.parseEther(
                    "1"
                ),

                false,

                3600

            );

            await market
            .connect(bidder1)
            .bid(

                0,

                {

                    value:

                    ethers
                    .parseEther(
                        "2"
                    )

                }

            );

            const auction =
                await market
                .auctions(0);

            expect(

                auction
                .highestBidder

            )

            .to.equal(

                bidder1
                .address

            );

        }
    );

    it(
        "Bid maior substitui anterior",
        async function () {

            await nft
            .connect(seller)
            .mint(
                "ipfs://paw"
            );

            await nft
            .connect(seller)
            .approve(

                await market
                .getAddress(),

                0

            );

            await market
            .connect(seller)
            .startAuction(

                await nft
                .getAddress(),

                0,

                ethers.parseEther(
                    "1"
                ),

                false,

                3600

            );

            await market
            .connect(bidder1)
            .bid(

                0,

                {

                    value:

                    ethers
                    .parseEther(
                        "2"
                    )

                }

            );

            await market
            .connect(bidder2)
            .bid(

                0,

                {

                    value:

                    ethers
                    .parseEther(
                        "3"
                    )

                }

            );

            const auction =
                await market
                .auctions(0);

            expect(

                auction
                .highestBidder

            )

            .to.equal(

                bidder2
                .address

            );

        }
    );

    it(
        "Nao aceita bid abaixo minimo",
        async function () {

            await nft
            .connect(seller)
            .mint(
                "ipfs://paw"
            );

            await nft
            .connect(seller)
            .approve(

                await market
                .getAddress(),

                0

            );

            await market
            .connect(seller)
            .startAuction(

                await nft
                .getAddress(),

                0,

                ethers.parseEther(
                    "1"
                ),

                false,

                3600

            );

            await expect(

                market
                .connect(bidder1)
                .bid(

                    0,

                    {

                        value:

                        ethers
                        .parseEther(
                            "0.5"
                        )

                    }

                )

            )

            .to
            .be
            .revertedWith(

                "Below minimum"

            );

        }
    );

});