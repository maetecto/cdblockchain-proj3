// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPawNFT {
    function ownerOf(uint256 tokenId) external view returns (address);

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function getApproved(
        uint256 tokenId
    ) external view returns (address);

    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);
}