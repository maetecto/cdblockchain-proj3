import { expect } from "chai";
import hre from "hardhat";

describe("PawNFT", function () {

    let nft;
    let owner;
    let user;
    let ethers;

    beforeEach(async function () {

        ethers =
            (await hre.network
                .getOrCreate())
                .ethers;

        [owner, user] =
            await ethers.getSigners();

        const NFT =
            await ethers
            .getContractFactory(
                "PawNFT"
            );

        nft =
            await NFT.deploy();

        await nft
            .waitForDeployment();

    });

    it(
        "Deploy nome/simbolo",
        async function () {

            expect(
                await nft.name()
            ).to.equal(
                "Pawn NFT"
            );

            expect(
                await nft.symbol()
            ).to.equal(
                "PAWN"
            );

        }
    );

    it(
        "Mint cria NFT",
        async function () {

            const uri =
                "ipfs://paw1";

            await nft
                .connect(user)
                .mint(uri);

            expect(

                await nft.ownerOf(0)

            ).to.equal(
                user.address
            );

        }
    );

    it(
        "Metadata correta",
        async function () {

            const uri =
                "ipfs://paw1";

            await nft
                .connect(user)
                .mint(uri);

            expect(

                await nft
                .tokenURI(0)

            ).to.equal(
                uri
            );

        }
    );

    it(
        "Burn remove NFT",
        async function () {

            await nft
                .connect(user)
                .mint(
                    "ipfs://paw"
                );

            await nft
                .connect(user)
                .burn(0);

            await expect(

                nft.ownerOf(0)

            )
            .to.be
            .revertedWithCustomError(
                nft,
                "ERC721NonexistentToken"
            );

        }
    );

    it(
        "Nao owner nao faz burn",
        async function () {

            await nft
                .connect(user)
                .mint(
                    "ipfs://paw"
                );

            await expect(

                nft
                .burn(0)

            )
            .to.be
            .revertedWith(
                "Not owner"
            );

        }
    );

});