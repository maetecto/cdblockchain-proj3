// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IDEXToken.sol";
import "./interfaces/IPawNFT.sol";

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
    uint256 fundedAt;
    uint256 deadline;
    address lender;
    uint256 lenderDEXLocked;
    bool funded;
    bool active;
}

contract DEXNFTMarket is ReentrancyGuard {
    IDEXToken public dex;
    IPawNFT public pawNFT;

    address public owner;

    uint256 public dexLoanInterestBps;
    uint256 public earlyCloseFeeBps;
    uint256 public paymentCycle;
    uint256 public nftSaleFeeBps;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(address => DexLoan) public dexLoans;
    mapping(uint256 => NftLoanRequest) public nftLoans;
    mapping(address => uint256) public pendingETHWithdrawals;

    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed buyer);
    event AuctionStarted(uint256 indexed tokenId);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address winner);
    event DexLoanOpened(address indexed borrower, uint256 collateral, uint256 borrowedETH);
    event DexLoanClosed(address indexed borrower);
    event NFTLoanRequested(uint256 indexed tokenId, uint256 requestedETH);
    event NFTLoanFunded(uint256 indexed tokenId, address lender);
    event PendingWithdrawalAdded(address indexed user, uint256 amount);
    event ETHWithdrawn(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address dexAddress, address nftAddress) {
        owner = msg.sender;
        dex = IDEXToken(dexAddress);
        pawNFT = IPawNFT(nftAddress);

        dexLoanInterestBps = 500;
        earlyCloseFeeBps = 300;
        paymentCycle = 30 days;
        nftSaleFeeBps = 500;
    }

    function setInterest(uint256 newRate) external onlyOwner {
        dexLoanInterestBps = newRate;
    }

    function setEarlyFee(uint256 newFee) external onlyOwner {
        earlyCloseFeeBps = newFee;
    }

    function setPaymentCycle(uint256 newCycle) external onlyOwner {
        paymentCycle = newCycle;
    }

    function setNFTSaleFee(uint256 newFee) external onlyOwner {
        nftSaleFeeBps = newFee;
    }

    function withdrawETH() external nonReentrant {
        uint256 amount = pendingETHWithdrawals[msg.sender];
        require(amount > 0, "No pending ETH");

        pendingETHWithdrawals[msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "ETH withdraw failed");

        emit ETHWithdrawn(msg.sender, amount);
    }

    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        bool inDEX
    ) external nonReentrant {
        require(price > 0, "Invalid price");

        IPawNFT nft = IPawNFT(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");

        nft.transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            inDEX: inDEX,
            active: true
        });

        emit NFTListed(tokenId, msg.sender, price);
    }

    function buyNFT(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");

        listing.active = false;

        uint256 fee = (listing.price * nftSaleFeeBps) / 10000;
        uint256 sellerAmount = listing.price - fee;

        if (listing.inDEX) {
            require(dex.transferFrom(msg.sender, listing.seller, sellerAmount), "DEX seller payment failed");
            if (fee > 0) {
                require(dex.transferFrom(msg.sender, owner, fee), "DEX fee payment failed");
            }
        } else {
            require(msg.value >= listing.price, "Need more ETH");

            pendingETHWithdrawals[listing.seller] += sellerAmount;
            emit PendingWithdrawalAdded(listing.seller, sellerAmount);

            if (fee > 0) {
                pendingETHWithdrawals[owner] += fee;
                emit PendingWithdrawalAdded(owner, fee);
            }

            uint256 excess = msg.value - listing.price;
            if (excess > 0) {
                pendingETHWithdrawals[msg.sender] += excess;
                emit PendingWithdrawalAdded(msg.sender, excess);
            }
        }

        IPawNFT(listing.nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(tokenId, msg.sender);
    }

    function startAuction(
        address nftContract,
        uint256 tokenId,
        uint256 minPrice,
        bool inDEX,
        uint256 duration
    ) external nonReentrant {
        require(minPrice > 0, "Invalid price");
        require(duration > 0, "Invalid duration");
        require(!inDEX, "DEX bids unsupported");

        IPawNFT nft = IPawNFT(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");

        nft.transferFrom(msg.sender, address(this), tokenId);

        auctions[tokenId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            minPrice: minPrice,
            highestBid: 0,
            highestBidder: address(0),
            inDEX: false,
            endTime: block.timestamp + duration,
            active: true
        });

        emit AuctionStarted(tokenId);
    }

    function bid(uint256 tokenId) external payable nonReentrant {
        Auction storage auction = auctions[tokenId];

        require(auction.active, "No auction");
        require(!auction.inDEX, "DEX bids unsupported");
        require(block.timestamp < auction.endTime, "Ended");
        require(msg.value > auction.highestBid, "Bid too low");
        require(msg.value >= auction.minPrice, "Below minimum");

        if (auction.highestBidder != address(0)) {
            pendingETHWithdrawals[auction.highestBidder] += auction.highestBid;
            emit PendingWithdrawalAdded(auction.highestBidder, auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    function endAuction(uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[tokenId];

        require(auction.active, "No auction");
        require(block.timestamp >= auction.endTime, "Too early");

        auction.active = false;

        if (auction.highestBidder == address(0)) {
            IPawNFT(auction.nftContract).transferFrom(address(this), auction.seller, tokenId);
            emit AuctionEnded(tokenId, address(0));
            return;
        }

        uint256 fee = (auction.highestBid * nftSaleFeeBps) / 10000;
        uint256 sellerAmount = auction.highestBid - fee;

        pendingETHWithdrawals[auction.seller] += sellerAmount;
        emit PendingWithdrawalAdded(auction.seller, sellerAmount);

        if (fee > 0) {
            pendingETHWithdrawals[owner] += fee;
            emit PendingWithdrawalAdded(owner, fee);
        }

        IPawNFT(auction.nftContract).transferFrom(address(this), auction.highestBidder, tokenId);

        emit AuctionEnded(tokenId, auction.highestBidder);
    }

    function borrowETHWithDEX(uint256 collateralDEX) external nonReentrant {
        require(collateralDEX > 0, "Invalid collateral");
        require(!dexLoans[msg.sender].active, "Loan exists");

        require(dex.transferFrom(msg.sender, address(this), collateralDEX), "DEX transfer failed");

        uint256 ethValue = collateralDEX / (100 * 1e18);
        require(address(this).balance >= ethValue, "No liquidity");

        dexLoans[msg.sender] = DexLoan({
            borrower: msg.sender,
            collateralDEX: collateralDEX,
            borrowedETH: ethValue,
            startTime: block.timestamp,
            nextPaymentDue: block.timestamp + paymentCycle,
            active: true
        });

        pendingETHWithdrawals[msg.sender] += ethValue;
        emit PendingWithdrawalAdded(msg.sender, ethValue);

        emit DexLoanOpened(msg.sender, collateralDEX, ethValue);
    }

    function repayDEXLoan() external payable nonReentrant {
        DexLoan storage loan = dexLoans[msg.sender];
        require(loan.active, "No loan");

        uint256 interest = (loan.borrowedETH * dexLoanInterestBps) / 10000;
        uint256 total = loan.borrowedETH + interest;

        require(msg.value >= total, "Need more ETH");

        loan.active = false;

        require(dex.transfer(msg.sender, loan.collateralDEX), "DEX return failed");

        uint256 excess = msg.value - total;
        if (excess > 0) {
            pendingETHWithdrawals[msg.sender] += excess;
            emit PendingWithdrawalAdded(msg.sender, excess);
        }

        emit DexLoanClosed(msg.sender);
    }

    function requestNFTLoan(
        address nftContract,
        uint256 tokenId,
        uint256 requestedETH,
        uint256 interestRateBps,
        uint256 duration
    ) external nonReentrant {
        require(requestedETH > 0, "Invalid ETH");
        require(duration > 0, "Invalid duration");

        IPawNFT nft = IPawNFT(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");

        nft.transferFrom(msg.sender, address(this), tokenId);

        nftLoans[tokenId] = NftLoanRequest({
            borrower: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            requestedETH: requestedETH,
            interestRateBps: interestRateBps,
            duration: duration,
            fundedAt: 0,
            deadline: 0,
            lender: address(0),
            lenderDEXLocked: 0,
            funded: false,
            active: true
        });

        emit NFTLoanRequested(tokenId, requestedETH);
    }

    function fundNFTLoan(uint256 tokenId, uint256 dexBacking) external nonReentrant {
        NftLoanRequest storage loan = nftLoans[tokenId];

        require(loan.active, "No loan");
        require(!loan.funded, "Funded");
        require(dex.transferFrom(msg.sender, address(this), dexBacking), "DEX failed");
        require(address(this).balance >= loan.requestedETH, "No ETH");

        loan.lender = msg.sender;
        loan.lenderDEXLocked = dexBacking;
        loan.funded = true;
        loan.fundedAt = block.timestamp;
        loan.deadline = block.timestamp + loan.duration;

        pendingETHWithdrawals[loan.borrower] += loan.requestedETH;
        emit PendingWithdrawalAdded(loan.borrower, loan.requestedETH);

        emit NFTLoanFunded(tokenId, msg.sender);
    }

    function repayNFTLoan(uint256 tokenId) external payable nonReentrant {
        NftLoanRequest storage loan = nftLoans[tokenId];

        require(loan.funded, "No funding");
        require(loan.active, "Inactive loan");
        require(msg.sender == loan.borrower, "Not borrower");

        uint256 interest = (loan.requestedETH * loan.interestRateBps) / 10000;
        uint256 total = loan.requestedETH + interest;

        require(msg.value >= total, "Need ETH");

        loan.active = false;

        IPawNFT(loan.nftContract).transferFrom(address(this), loan.borrower, tokenId);
        require(dex.transfer(loan.lender, loan.lenderDEXLocked), "DEX return failed");

        uint256 lenderShare = interest / 2;
        if (lenderShare > 0) {
            pendingETHWithdrawals[loan.lender] += lenderShare;
            emit PendingWithdrawalAdded(loan.lender, lenderShare);
        }

        uint256 excess = msg.value - total;
        if (excess > 0) {
            pendingETHWithdrawals[msg.sender] += excess;
            emit PendingWithdrawalAdded(msg.sender, excess);
        }
    }

    function claimNFTDefault(uint256 tokenId) external nonReentrant {
        NftLoanRequest storage loan = nftLoans[tokenId];

        require(loan.funded, "No funding");
        require(loan.active, "Inactive loan");
        require(msg.sender == loan.lender, "Not lender");
        require(loan.deadline > 0, "Deadline not set");
        require(block.timestamp > loan.deadline, "Too early");

        loan.active = false;

        IPawNFT(loan.nftContract).transferFrom(address(this), owner, tokenId);
        require(dex.transfer(loan.lender, loan.lenderDEXLocked), "DEX return failed");
    }

    receive() external payable {}
    fallback() external payable {}
}