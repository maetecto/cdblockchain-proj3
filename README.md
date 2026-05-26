# DEX NFT Pawning DApp

A decentralized Ethereum application built with Solidity and Hardhat.

This project implements a token exchange (DEX), NFT marketplace, NFT auctions, DEX-backed loans, and NFT-backed lending mechanisms.

---

## Features

### DEX Token System

ERC20 token implementation with:

- Buy DEX tokens using ETH
- Sell DEX tokens back for ETH
- Configurable token price
- ETH reserve management

Smart Contract:

```text
contracts/DEXToken.sol
```

---

### NFT System

ERC721 NFT implementation with:

- Mint NFT
- Burn NFT
- Metadata support
- Ownership tracking

Smart Contract:

```text
contracts/PawNFT.sol
```

---

### NFT Marketplace

Users can:

- List NFTs
- Buy NFTs using ETH
- Buy NFTs using DEX tokens

Smart Contract:

```text
contracts/DEXNFTMarket.sol
```

---

### NFT Auctions

Auction functionality:

- Create auction
- Place bids
- Automatic highest bid replacement
- Previous bidder refund
- Minimum bid enforcement

---

### DEX Collateral Loans

Users can:

- Lock DEX tokens as collateral
- Borrow ETH
- Repay loan
- Recover collateral

---

### NFT-backed Loans

Users can:

- Lock NFT collateral
- Request ETH loan
- External lender funds loan
- Repay loan and recover NFT
- NFT transferred on default

---

## Architecture

```text
dex-nft-pawning-dapp/

contracts/
├── DEXToken.sol
├── PawNFT.sol
├── DEXNFTMarket.sol
├── interfaces/
│   ├── IDEXToken.sol
│   └── IPawNFT.sol

test/
├── DEXToken.test.js
├── PawNFT.test.js
├── market.nft.test.js
├── market.auction.test.js
└── market.loans.test.js

scripts/
├── deploy.js
└── seed.js

frontend/
server/

.env
package.json
hardhat.config.js
README.md
```

---

## Installation

Install dependencies:

```bash
npm install
```

---

## Compile Contracts

```bash
npx hardhat compile
```

---

## Run Tests

```bash
npx hardhat test
```

Current status:

```text
28 passing tests
```

---

## Deployment

Deploy contracts:

```bash
npx hardhat run scripts/deploy.js
```

Seed demo data:

```bash
npx hardhat run scripts/seed.js
```

---

## Technologies Used

- Solidity
- Hardhat 3
- Ethers.js
- OpenZeppelin
- Mocha
- Chai

---

## Demo Flow

Example demo sequence:

1. Deploy contracts
2. Seed blockchain state
3. Buy DEX tokens
4. Mint NFT
5. List NFT
6. Buy NFT
7. Create auction
8. Borrow ETH using DEX collateral
9. Create NFT-backed loan
10. Repay loan
11. NFT default transfer
12. Run automated tests
