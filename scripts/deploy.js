import hre from "hardhat";

async function main() {

    const connection =
        await hre.network
        .connect();

    const ethers =
        connection.ethers;

    const [deployer] =
        await ethers
        .getSigners();

    console.log(
        "Deploy por:",
        deployer.address
    );

    const DEX =
        await ethers
        .getContractFactory(
            "DEXToken"
        );

    const dex =
        await DEX.deploy(

            1000000,

            ethers.parseEther(
                "0.001"
            )

        );

    await dex
        .waitForDeployment();

    console.log(

        "DEXToken:",

        await dex
        .getAddress()

    );

    const NFT =
        await ethers
        .getContractFactory(
            "PawNFT"
        );

    const nft =
        await NFT
        .deploy();

    await nft
        .waitForDeployment();

    console.log(

        "PawNFT:",

        await nft
        .getAddress()

    );

    const Market =
        await ethers
        .getContractFactory(
            "DEXNFTMarket"
        );

    const market =
        await Market
        .deploy(

            await dex
            .getAddress(),

            await nft
            .getAddress()

        );

    await market
        .waitForDeployment();

    console.log(

        "DEXNFTMarket:",

        await market
        .getAddress()

    );

    await deployer
    .sendTransaction({

        to:

        await market
        .getAddress(),

        value:

        ethers.parseEther(
            "20"
        )

    });

    console.log(
        "Liquidez ETH enviada"
    );

}

main()
.catch(

(error)=>{

console.error(
error
);

process.exitCode=1;

}

);