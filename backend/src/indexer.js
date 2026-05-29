const db = require("./db");
const { provider, marketContract, MARKET } = require("./config");

// Helpers de DB
const insertListing = db.prepare(`
  INSERT INTO listings (token_id, seller, nft_contract, price_wei, in_dex, active, created_tx, created_block, updated_at)
  VALUES (@token_id, @seller, @nft_contract, @price_wei, @in_dex, @active, @created_tx, @created_block, @updated_at)
`);

const markListingSold = db.prepare(`
  UPDATE listings
  SET active = 0,
      updated_at = @updated_at
  WHERE token_id = @token_id
    AND active = 1
`);

const upsertAuction = db.prepare(`
  INSERT INTO auctions (
    token_id, seller, nft_contract, min_price_wei, highest_bid_wei,
    highest_bidder, end_time, active, created_block, last_bid_block, updated_at
  )
  VALUES (
    @token_id, @seller, @nft_contract, @min_price_wei, @highest_bid_wei,
    @highest_bidder, @end_time, @active, @created_block, @last_bid_block, @updated_at
  )
`);

const updateAuctionBid = db.prepare(`
  UPDATE auctions
  SET highest_bid_wei = @highest_bid_wei,
      highest_bidder = @highest_bidder,
      last_bid_block = @last_bid_block,
      updated_at = @updated_at
  WHERE token_id = @token_id
    AND active = 1
`);

const closeAuction = db.prepare(`
  UPDATE auctions
  SET active = 0,
      updated_at = @updated_at
  WHERE token_id = @token_id
    AND active = 1
`);

async function bootstrapFromEvents() {
  const latestBlock = await provider.getBlockNumber();

  console.log("[indexer] Bootstrapping from block 0 to", latestBlock);

  // Limpar tabelas para demo (opcional)
  db.exec("DELETE FROM listings; DELETE FROM auctions;");

  // NFTListed(tokenId, seller, price)
  const listedEvents = await marketContract.queryFilter(
    marketContract.filters.NFTListed(),
    0,
    latestBlock
  );

  for (const ev of listedEvents) {
    const { tokenId, seller, price } = ev.args;
    insertListing.run({
      token_id: Number(tokenId),
      seller,
      nft_contract: NFT,
      price_wei: price.toString(),
      in_dex: 0, // não vem no evento, podes ler da view se quiseres
      active: 1,
      created_tx: ev.transactionHash,
      created_block: ev.blockNumber,
      updated_at: Date.now(),
    });
  }

  // NFTSold(tokenId, buyer)
  const soldEvents = await marketContract.queryFilter(
    marketContract.filters.NFTSold(),
    0,
    latestBlock
  );

  for (const ev of soldEvents) {
    const { tokenId } = ev.args;
    markListingSold.run({
      token_id: Number(tokenId),
      updated_at: Date.now(),
    });
  }

  // AuctionStarted(tokenId)
  const auctionStarted = await marketContract.queryFilter(
    marketContract.filters.AuctionStarted(),
    0,
    latestBlock
  );

  for (const ev of auctionStarted) {
    const { tokenId } = ev.args;
    const auction = await marketContract.auctions(tokenId);

    upsertAuction.run({
      token_id: Number(tokenId),
      seller: auction.seller,
      nft_contract: auction.nftContract,
      min_price_wei: auction.minPrice.toString(),
      highest_bid_wei: auction.highestBid.toString(),
      highest_bidder: auction.highestBidder,
      end_time: Number(auction.endTime),
      active: auction.active ? 1 : 0,
      created_block: ev.blockNumber,
      last_bid_block: null,
      updated_at: Date.now(),
    });
  }

  // BidPlaced(tokenId, bidder, amount)
  const bids = await marketContract.queryFilter(
    marketContract.filters.BidPlaced(),
    0,
    latestBlock
  );

  for (const ev of bids) {
    const { tokenId, bidder, amount } = ev.args;
    updateAuctionBid.run({
      token_id: Number(tokenId),
      highest_bid_wei: amount.toString(),
      highest_bidder: bidder,
      last_bid_block: ev.blockNumber,
      updated_at: Date.now(),
    });
  }

  // AuctionEnded(tokenId, winner)
  const ended = await marketContract.queryFilter(
    marketContract.filters.AuctionEnded(),
    0,
    latestBlock
  );

  for (const ev of ended) {
    const { tokenId } = ev.args;
    closeAuction.run({
      token_id: Number(tokenId),
      updated_at: Date.now(),
    });
  }

  console.log("[indexer] Bootstrap done.");
}

function subscribeToLiveEvents() {
  console.log("[indexer] Subscribing to live events on", MARKET);

  marketContract.on("NFTListed", (tokenId, seller, price, event) => {
    console.log("[event] NFTListed", tokenId.toString(), seller, price.toString());
    insertListing.run({
      token_id: Number(tokenId),
      seller,
      nft_contract: NFT,
      price_wei: price.toString(),
      in_dex: 0,
      active: 1,
      created_tx: event.transactionHash,
      created_block: event.blockNumber,
      updated_at: Date.now(),
    });
  });

  marketContract.on("NFTSold", (tokenId, buyer, event) => {
    console.log("[event] NFTSold", tokenId.toString(), buyer);
    markListingSold.run({
      token_id: Number(tokenId),
      updated_at: Date.now(),
    });
  });

  marketContract.on("AuctionStarted", async (tokenId, event) => {
    console.log("[event] AuctionStarted", tokenId.toString());
    const auction = await marketContract.auctions(tokenId);
    upsertAuction.run({
      token_id: Number(tokenId),
      seller: auction.seller,
      nft_contract: auction.nftContract,
      min_price_wei: auction.minPrice.toString(),
      highest_bid_wei: auction.highestBid.toString(),
      highest_bidder: auction.highestBidder,
      end_time: Number(auction.endTime),
      active: auction.active ? 1 : 0,
      created_block: event.blockNumber,
      last_bid_block: null,
      updated_at: Date.now(),
    });
  });

  marketContract.on("BidPlaced", (tokenId, bidder, amount, event) => {
    console.log("[event] BidPlaced", tokenId.toString(), bidder, amount.toString());
    updateAuctionBid.run({
      token_id: Number(tokenId),
      highest_bid_wei: amount.toString(),
      highest_bidder: bidder,
      last_bid_block: event.blockNumber,
      updated_at: Date.now(),
    });
  });

  marketContract.on("AuctionEnded", (tokenId, winner, event) => {
    console.log("[event] AuctionEnded", tokenId.toString(), winner);
    closeAuction.run({
      token_id: Number(tokenId),
      updated_at: Date.now(),
    });
  });
}

async function startIndexer() {
  await bootstrapFromEvents();
  subscribeToLiveEvents();
}

module.exports = { startIndexer };