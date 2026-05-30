# DEX NFT Pawning DApp

A decentralized Ethereum application built with Solidity, Hardhat, and a React frontend.

This project implements a DEX token marketplace, NFT marketplace, NFT auctions, DEX-backed loans, and NFT-backed lending mechanisms.

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

- List NFTs without transferring ownership to the marketplace during listing
- Buy NFTs using ETH
- Buy NFTs using DEX tokens
- Pay a 5% protocol fee on every NFT sale to the DApp owner

Smart Contract:

```text
contracts/DEXNFTMarket.sol
```

---

### NFT Auctions

Auction functionality:

- Create auction
- Place bids in ETH
- Automatic highest bid replacement
- Previous bidder refund
- Minimum bid enforcement
- Auction settlement with protocol fee

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
- External lender funds the loan with DEX backing
- Repay loan and recover NFT
- Lender receives half of the interest
- DApp owner receives the NFT on default

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

---

### Local Network

```bash
npx hardhat node
```

Starts a local Ethereum blockchain with pre-funded accounts for testing and development.

---

## Deployment

```bash
npx hardhat run scripts/deploy.js
npx hardhat run scripts/deploy.js --network localhost
```

Seed demo data:

```bash
npx hardhat run scripts/seed.js
npx hardhat run scripts/seed.js --network localhost
```

---

## Frontend

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Opens the DApp at:

```text
http://localhost:5173
```

---

## Technologies Used

- Solidity
- Hardhat 3
- Ethers.js
- OpenZeppelin
- Mocha
- Chai
- React
- Vite

---

## AI Usage

AI was used as a support tool for:
- reviewing contract structure and frontend architecture,
- identifying mismatches with the updated specification,
- suggesting security improvements and edge cases,
- helping refactor tests and UI copy.

All generated suggestions were manually reviewed, adapted, tested, and explained by the group.

---

## Demo Flow

1. Deploy contracts
2. Seed blockchain state
3. Buy DEX tokens
4. Mint NFT
5. List NFT
6. Buy NFT with 5% protocol fee
7. Create auction
8. Borrow ETH using DEX collateral
9. Create NFT-backed loan
10. Repay NFT-backed loan
11. Trigger NFT default to DApp owner
12. Run automated tests