const express = require("express");
const cors = require("cors");
const db = require("./db");
const { provider } = require("./config");
const { startIndexer } = require("./indexer");

const app = express();
app.use(cors());
app.use(express.json());

// Endpoints simples de leitura

app.get("/status", async (req, res) => {
  try {
    const block = await provider.getBlockNumber();
    const listingsCount = db.prepare("SELECT COUNT(*) as c FROM listings").get().c;
    const auctionsCount = db.prepare("SELECT COUNT(*) as c FROM auctions").get().c;
    res.json({
      network: "hardhat-localhost",
      latestBlock: block,
      listings: listingsCount,
      auctions: auctionsCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "status failed" });
  }
});

app.get("/listings", (req, res) => {
  const { active } = req.query;
  let rows;

  if (active === "true") {
    rows = db.prepare("SELECT * FROM listings WHERE active = 1 ORDER BY token_id").all();
  } else if (active === "false") {
    rows = db.prepare("SELECT * FROM listings WHERE active = 0 ORDER BY token_id").all();
  } else {
    rows = db.prepare("SELECT * FROM listings ORDER BY token_id").all();
  }

  res.json(rows);
});

app.get("/auctions", (req, res) => {
  const { active } = req.query;
  let rows;

  if (active === "true") {
    rows = db.prepare("SELECT * FROM auctions WHERE active = 1 ORDER BY token_id").all();
  } else if (active === "false") {
    rows = db.prepare("SELECT * FROM auctions WHERE active = 0 ORDER BY token_id").all();
  } else {
    rows = db.prepare("SELECT * FROM auctions ORDER BY token_id").all();
  }

  res.json(rows);
});

app.get("/auctions/:tokenId", (req, res) => {
  const tokenId = Number(req.params.tokenId);
  if (!Number.isFinite(tokenId)) {
    return res.status(400).json({ error: "invalid tokenId" });
  }
  const row = db.prepare("SELECT * FROM auctions WHERE token_id = ?").get(tokenId);
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
});

const PORT = 4000;

async function start() {
  await startIndexer();

  app.listen(PORT, () => {
    console.log(`Backend API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});