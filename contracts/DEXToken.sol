// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DEXToken is ERC20, Ownable {

    uint256 public tokenPrice;

    event DEXPurchased(
        address indexed buyer,
        uint256 ethSpent,
        uint256 dexReceived
    );

    event DEXSold(
        address indexed seller,
        uint256 dexSold,
        uint256 ethReceived
    );

    event PriceUpdated(
        uint256 oldPrice,
        uint256 newPrice
    );

    constructor(
        uint256 initialSupply,
        uint256 initialPrice
    )
        ERC20("DEX Token", "DEX")
        Ownable(msg.sender)
    {
        tokenPrice = initialPrice;

        _mint(
            address(this),
            initialSupply * 10 ** decimals()
        );
    }

    // apenas admin cria DEX
    function mint(
        address to,
        uint256 amount
    )
        external
        onlyOwner
    {
        _mint(
            to,
            amount
        );
    }

    function buyDEX()
        external
        payable
    {
        require(
            msg.value > 0,
            "Send ETH"
        );

        uint256 amount =
            (msg.value *
            10 ** decimals())
            / tokenPrice;

        require(
            balanceOf(address(this))
            >= amount,
            "Insufficient liquidity"
        );

        _transfer(
            address(this),
            msg.sender,
            amount
        );

        emit DEXPurchased(
            msg.sender,
            msg.value,
            amount
        );
    }

    function sellDEX(
        uint256 amount
    )
        external
    {
        require(
            amount > 0,
            "Invalid amount"
        );

        require(
            balanceOf(msg.sender)
            >= amount,
            "Not enough DEX"
        );

        uint256 ethAmount =
            (amount *
            tokenPrice)
            / 10 ** decimals();

        require(
            address(this).balance
            >= ethAmount,
            "Not enough ETH reserve"
        );

        _transfer(
            msg.sender,
            address(this),
            amount
        );

        payable(
            msg.sender
        ).transfer(
            ethAmount
        );

        emit DEXSold(
            msg.sender,
            amount,
            ethAmount
        );
    }

    function setTokenPrice(
        uint256 newPrice
    )
        external
        onlyOwner
    {
        uint256 old =
            tokenPrice;

        tokenPrice =
            newPrice;

        emit PriceUpdated(
            old,
            newPrice
        );
    }

    function getETHReserve()
        external
        view
        returns(uint256)
    {
        return
            address(this)
            .balance;
    }

    receive()
        external
        payable
    {}
}