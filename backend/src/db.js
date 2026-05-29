const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "dev.db");
const db = new Database(dbPath);

// Criar tabelas se não existirem
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    seller TEXT NOT NULL,
    nft_contract TEXT NOT NULL,
    price_wei TEXT NOT NULL,
    in_dex INTEGER NOT NULL,
    active INTEGER NOT NULL,
    created_tx TEXT NOT NULL,
    created_block INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    seller TEXT NOT NULL,
    nft_contract TEXT NOT NULL,
    min_price_wei TEXT NOT NULL,
    highest_bid_wei TEXT NOT NULL,
    highest_bidder TEXT,
    end_time INTEGER NOT NULL,
    active INTEGER NOT NULL,
    created_block INTEGER NOT NULL,
    last_bid_block INTEGER,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dex_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    borrower TEXT NOT NULL,
    collateral_dex TEXT NOT NULL,
    borrowed_eth TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    next_payment_due INTEGER,
    active INTEGER NOT NULL,
    opened_block INTEGER NOT NULL,
    closed_block INTEGER
  );

  CREATE TABLE IF NOT EXISTS nft_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    borrower TEXT NOT NULL,
    nft_contract TEXT NOT NULL,
    requested_eth TEXT NOT NULL,
    interest_bps INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    lender TEXT,
    lender_dex_locked TEXT,
    funded INTEGER NOT NULL,
    active INTEGER NOT NULL,
    deadline INTEGER,
    state TEXT NOT NULL,
    opened_block INTEGER NOT NULL,
    closed_block INTEGER
  );
`);

module.exports = db;