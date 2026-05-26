// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PawNFT is ERC721, Ownable {

    uint256 private nextTokenId;

    mapping(uint256 => string)
        private tokenURIs;

    event NFTMinted(
        address indexed owner,
        uint256 tokenId,
        string metadata
    );

    event NFTBurned(
        uint256 tokenId
    );

    constructor()
        ERC721(
            "Pawn NFT",
            "PAWN"
        )
        Ownable(msg.sender)
    {}

    function mint(
        string memory metadataURI
    )
        external
    {
        uint256 tokenId =
            nextTokenId;

        nextTokenId++;

        _safeMint(
            msg.sender,
            tokenId
        );

        tokenURIs[tokenId] =
            metadataURI;

        emit NFTMinted(
            msg.sender,
            tokenId,
            metadataURI
        );
    }

    function burn(
        uint256 tokenId
    )
        external
    {
        require(
            ownerOf(tokenId)
            == msg.sender,
            "Not owner"
        );

        _burn(tokenId);

        delete tokenURIs[
            tokenId
        ];

        emit NFTBurned(
            tokenId
        );
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override
        returns(string memory)
    {
        require(
            ownerOf(tokenId)
            != address(0),
            "NFT does not exist"
        );

        return tokenURIs[
            tokenId
        ];
    }

    function getNextTokenId()
        external
        view
        returns(uint256)
    {
        return nextTokenId;
    }

}