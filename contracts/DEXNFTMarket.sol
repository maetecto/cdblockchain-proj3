// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
struct Listing {
    address seller;
    address nftContract;
    uint256 tokenId;
    uint256 price;
    bool inDEX;
    bool active;
}

struct Auction {
    address seller;
    address nftContract;
    uint256 tokenId;
    uint256 minPrice;
    uint256 highestBid;
    address highestBidder;
    bool inDEX;
    uint256 endTime;
    bool active;
}

struct DexLoan {
    address borrower;
    uint256 collateralDEX;
    uint256 borrowedETH;
    uint256 startTime;
    uint256 nextPaymentDue;
    bool active;
}

struct NftLoanRequest {
    address borrower;
    address nftContract;
    uint256 tokenId;
    uint256 requestedETH;
    uint256 interestRateBps;
    uint256 duration;
    address lender;
    uint256 lenderDEXLocked;
    bool funded;
    bool active;
}

import "./interfaces/IDEXToken.sol";
import "./interfaces/IPawNFT.sol";

contract DEXNFTMarket {

    IDEXToken public dex;
    IPawNFT public pawNFT;

    address public owner;

    uint256 public dexLoanInterestBps;
    uint256 public earlyCloseFeeBps;
    uint256 public paymentCycle;

    mapping(uint256 => Listing)
        public listings;

    mapping(uint256 => Auction)
        public auctions;

    mapping(address => DexLoan)
        public dexLoans;

    mapping(uint256 => NftLoanRequest)
        public nftLoans;

    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event NFTSold(
        uint256 indexed tokenId,
        address indexed buyer
    );

    event AuctionStarted(
        uint256 indexed tokenId
    );

    event BidPlaced(
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionEnded(
        uint256 indexed tokenId,
        address winner
    );

    event DexLoanOpened(
        address indexed borrower,
        uint256 collateral,
        uint256 borrowedETH
    );

    event DexLoanClosed(
        address indexed borrower
    );

    event NFTLoanRequested(
        uint256 indexed tokenId,
        uint256 requestedETH
    );

    event NFTLoanFunded(
        uint256 indexed tokenId,
        address lender
    );

    modifier onlyOwner() {

        require(
            msg.sender == owner,
            "Not owner"
        );

        _;
    }

    constructor(
        address dexAddress,
        address nftAddress
    ) {

        owner =
            msg.sender;

        dex =
            IDEXToken(
                dexAddress
            );

        pawNFT =
            IPawNFT(
                nftAddress
            );

        dexLoanInterestBps =
            500;

        earlyCloseFeeBps =
            300;

        paymentCycle =
            30 days;
    }

    function setInterest(
        uint256 newRate
    )
        external
        onlyOwner
    {
        dexLoanInterestBps =
            newRate;
    }

    function setEarlyFee(
        uint256 newFee
    )
        external
        onlyOwner
    {
        earlyCloseFeeBps =
            newFee;
    }

    function setPaymentCycle(
        uint256 newCycle
    )
        external
        onlyOwner
    {
        paymentCycle =
            newCycle;
    }

    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        bool inDEX
    )
        external
    {
        require(
            price > 0,
            "Invalid price"
        );

        IPawNFT nft =
            IPawNFT(
                nftContract
            );

        require(

            nft.ownerOf(
                tokenId
            )

            == msg.sender,

            "Not owner"

        );

        nft.transferFrom(

            msg.sender,

            address(this),

            tokenId

        );

        listings[tokenId] =
            Listing({

                seller:
                    msg.sender,

                nftContract:
                    nftContract,

                tokenId:
                    tokenId,

                price:
                    price,

                inDEX:
                    inDEX,

                active:
                    true

            });

        emit NFTListed(

            tokenId,

            msg.sender,

            price

        );
    }

    function buyNFT(
        uint256 tokenId
    )
        external
        payable
    {

        Listing storage listing =
            listings[
                tokenId
            ];

        require(
            listing.active,
            "Not listed"
        );

        listing.active =
            false;

        if(
            listing.inDEX
        ){

            require(

                dex.transferFrom(

                    msg.sender,

                    listing.seller,

                    listing.price

                ),

                "DEX payment failed"

            );

        }
        else{

            require(

                msg.value
                >=
                listing.price,

                "Need more ETH"

            );

            payable(
                listing.seller
            ).transfer(
                listing.price
            );

        }

        IPawNFT(
            listing.nftContract
        )
        .transferFrom(

            address(this),

            msg.sender,

            tokenId

        );

        emit NFTSold(

            tokenId,

            msg.sender

        );

    }

    function startAuction(
        address nftContract,
        uint256 tokenId,
        uint256 minPrice,
        bool inDEX,
        uint256 duration
    )
        external
    {

        require(
            minPrice > 0,
            "Invalid price"
        );

        require(
            duration > 0,
            "Invalid duration"
        );

        IPawNFT nft =
            IPawNFT(
                nftContract
            );

        require(

            nft.ownerOf(
                tokenId
            )

            ==
            msg.sender,

            "Not owner"

        );

        nft.transferFrom(

            msg.sender,

            address(this),

            tokenId

        );

        auctions[tokenId] =
            Auction({

                seller:
                    msg.sender,

                nftContract:
                    nftContract,

                tokenId:
                    tokenId,

                minPrice:
                    minPrice,

                highestBid:
                    0,

                highestBidder:
                    address(0),

                inDEX:
                    inDEX,

                endTime:

                    block.timestamp
                    +
                    duration,

                active:
                    true

            });

        emit AuctionStarted(
            tokenId
        );

    }

    function bid(
        uint256 tokenId
    )
        external
        payable
    {

        Auction storage auction =
            auctions[tokenId];

        require(
            auction.active,
            "No auction"
        );

        require(

            block.timestamp
            <
            auction.endTime,

            "Ended"

        );

        require(

            msg.value
            >
            auction.highestBid,

            "Bid too low"

        );

        require(

            msg.value
            >=
            auction.minPrice,

            "Below minimum"

        );

        if(

            auction
            .highestBidder

            !=

            address(0)

        ){

            payable(

                auction
                .highestBidder

            ).transfer(

                auction
                .highestBid

            );

        }

        auction.highestBid =
            msg.value;

        auction.highestBidder =
            msg.sender;

        emit BidPlaced(

            tokenId,

            msg.sender,

            msg.value

        );

    }

    function borrowETHWithDEX(
        uint256 collateralDEX
    )
        external
    {

        require(
            collateralDEX > 0,
            "Invalid collateral"
        );

        require(

            !dexLoans[
                msg.sender
            ].active,

            "Loan exists"

        );

        require(

            dex.transferFrom(

                msg.sender,

                address(this),

                collateralDEX

            ),

            "DEX transfer failed"

        );

        uint256 ethValue =

            collateralDEX
            /
            (100 * 1e18);

        require(

            address(this)
            .balance

            >=

            ethValue,

            "No liquidity"

        );

        dexLoans[
            msg.sender

        ] = DexLoan({

            borrower:
                msg.sender,

            collateralDEX:
                collateralDEX,

            borrowedETH:
                ethValue,

            startTime:
                block.timestamp,

            nextPaymentDue:

                block.timestamp
                +
                paymentCycle,

            active:
                true

        });

        payable(
            msg.sender
        ).transfer(
            ethValue
        );

        emit DexLoanOpened(

            msg.sender,

            collateralDEX,

            ethValue

        );

    }

    function repayDEXLoan()
        external
        payable
    {

        DexLoan storage loan =

            dexLoans[
                msg.sender
            ];

        require(

            loan.active,

            "No loan"

        );

        uint256 interest =

            loan.borrowedETH
            *
            dexLoanInterestBps

            /

            10000;

        uint256 total =

            loan.borrowedETH
            +
            interest;

        require(

            msg.value
            >=
            total,

            "Need more ETH"

        );

        loan.active =
            false;

        require(

            dex.transfer(

                msg.sender,

                loan.collateralDEX

            ),

            "DEX return failed"

        );

        emit DexLoanClosed(
            msg.sender
        );

    }

    function requestNFTLoan(
        address nftContract,
        uint256 tokenId,
        uint256 requestedETH,
        uint256 interestRateBps,
        uint256 duration
    )
        external
    {

        require(
            requestedETH > 0,
            "Invalid ETH"
        );

        require(
            duration > 0,
            "Invalid duration"
        );

        IPawNFT nft =
            IPawNFT(
                nftContract
            );

        require(

            nft.ownerOf(
                tokenId
            )

            ==
            msg.sender,

            "Not owner"

        );

        nft.transferFrom(

            msg.sender,

            address(this),

            tokenId

        );

        nftLoans[tokenId] =
            NftLoanRequest({

                borrower:
                    msg.sender,

                nftContract:
                    nftContract,

                tokenId:
                    tokenId,

                requestedETH:
                    requestedETH,

                interestRateBps:
                    interestRateBps,

                duration:
                    duration,

                lender:
                    address(0),

                lenderDEXLocked:
                    0,

                funded:
                    false,

                active:
                    true

            });

        emit NFTLoanRequested(

            tokenId,

            requestedETH

        );

    }

    function fundNFTLoan(
        uint256 tokenId,
        uint256 dexBacking
    )
        external
    {

        NftLoanRequest
        storage loan =

            nftLoans[
                tokenId
            ];

        require(
            loan.active,
            "No loan"
        );

        require(
            !loan.funded,
            "Funded"
        );

        require(

            dex.transferFrom(

                msg.sender,

                address(this),

                dexBacking

            ),

            "DEX failed"

        );

        require(

            address(this)
            .balance

            >=

            loan
            .requestedETH,

            "No ETH"

        );

        loan.lender =
            msg.sender;

        loan.lenderDEXLocked =
            dexBacking;

        loan.funded =
            true;

        payable(
            loan.borrower
        ).transfer(

            loan.requestedETH

        );

        emit NFTLoanFunded(

            tokenId,

            msg.sender

        );

    }

    function repayNFTLoan(
        uint256 tokenId
    )
        external
        payable
    {

        NftLoanRequest
        storage loan =

            nftLoans[
                tokenId
            ];

        require(
            loan.funded,
            "No funding"
        );

        require(

            msg.sender
            ==
            loan.borrower,

            "Not borrower"

        );

        uint256 interest =

            loan.requestedETH

            *

            loan.interestRateBps

            /

            10000;

        uint256 total =

            loan.requestedETH
            +
            interest;

        require(

            msg.value
            >=
            total,

            "Need ETH"

        );

        IPawNFT(

            loan.nftContract

        )

        .transferFrom(

            address(this),

            loan.borrower,

            tokenId

        );

        dex.transfer(

            loan.lender,

            loan.lenderDEXLocked

        );

        payable(
            loan.lender
        ).transfer(
            interest
        );

        loan.active =
            false;

    }

    function claimNFTDefault(
        uint256 tokenId
    )
        external
    {

        NftLoanRequest
        storage loan =

            nftLoans[
                tokenId
            ];

        require(

            loan.funded,

            "No funding"

        );

        require(

            msg.sender
            ==
            loan.lender,

            "Not lender"

        );

        require(

            block.timestamp

            >

            loan.duration,

            "Too early"

        );

        IPawNFT(

            loan.nftContract

        )

        .transferFrom(

            address(this),

            loan.lender,

            tokenId

        );

        loan.active =
            false;

    }

    receive()
        external
        payable
    {}

    fallback()
        external
        payable
{}
}