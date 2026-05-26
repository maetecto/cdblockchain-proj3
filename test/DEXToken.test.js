import { expect } from "chai";
import hre from "hardhat";

describe("DEXToken", function () {

    let dex;
    let owner;
    let user;
    let ethers;

    beforeEach(async function () {

        ethers =
            await hre.network
                .getOrCreate()
                .then(c => c.ethers);

        [owner, user] =
            await ethers.getSigners();

        const DEX =
            await ethers.getContractFactory(
                "DEXToken"
            );

        dex =
            await DEX.deploy(
                1000000,
                ethers.parseEther(
                    "0.001"
                )
            );

        await dex.waitForDeployment();

    });

    it(
        "Deploy com nome/simbolo corretos",
        async function () {

            expect(
                await dex.name()
            ).to.equal(
                "DEX Token"
            );

            expect(
                await dex.symbol()
            ).to.equal(
                "DEX"
            );

        }
    );

    it(
        "Apenas owner pode fazer mint",
        async function () {

            await expect(

                dex
                .connect(user)
                .mint(
                    user.address,
                    1000n
                )

            ).to.be.revertedWithCustomError(
                dex,
                "OwnableUnauthorizedAccount"
            );

        }
    );

    it(
        "Owner consegue fazer mint",
        async function () {

            await dex.mint(
                user.address,
                5000n
            );

            expect(

                await dex.balanceOf(
                    user.address
                )

            ).to.equal(
                5000n
            );

        }
    );

    it(
        "buyDEX entrega tokens",
        async function () {

            await dex
                .connect(user)
                .buyDEX({

                    value:
                    ethers.parseEther(
                        "1"
                    )

                });

            expect(

                await dex.balanceOf(
                    user.address
                )

            ).to.be.gt(
                0n
            );

        }
    );

    it(
        "sellDEX devolve ETH",
        async function () {

            await dex
                .connect(user)
                .buyDEX({

                    value:
                    ethers.parseEther(
                        "1"
                    )

                });

            const dexBalance =
                await dex.balanceOf(
                    user.address
                );

            const ethBefore =
                await ethers.provider
                .getBalance(
                    user.address
                );

            const tx =
                await dex
                .connect(user)
                .sellDEX(
                    dexBalance
                );

            await tx.wait();

            const ethAfter =
                await ethers.provider
                .getBalance(
                    user.address
                );

            expect(
                ethAfter
            ).to.be.gt(
                ethBefore
            );

        }
    );

});