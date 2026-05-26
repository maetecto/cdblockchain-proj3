// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDEXToken {

    function buyDEX()
        external
        payable;

    function sellDEX(
        uint256 amount
    )
        external;

    function transfer(
        address to,
        uint256 amount
    )
        external
        returns(bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    )
        external
        returns(bool);

    function balanceOf(
        address account
    )
        external
        view
        returns(uint256);

}