import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import { DEX, NFT, MARKET, DEX_ABI, NFT_ABI, MARKET_ABI } from "./contracts";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "dex", label: "DEX" },
  { key: "nfts", label: "NFTs" },
  { key: "market", label: "Marketplace" },
  { key: "auctions", label: "Auctions" },
  { key: "loans", label: "Loans" },
];

function shortAddress(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEth(value) {
  try {
    return Number(ethers.formatEther(value ?? 0)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

function formatDex(value) {
  try {
    return Number(ethers.formatUnits(value ?? 0, 18)).toFixed(2);
  } catch {
    return "0.00";
  }
}

function safeParseEth(value) {
  try {
    if (!value?.trim()) return null;
    return ethers.parseEther(value.trim());
  } catch {
    return null;
  }
}

function safeParseDex(value) {
  try {
    if (!value?.trim()) return null;
    return ethers.parseUnits(value.trim(), 18);
  } catch {
    return null;
  }
}

function safeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export default function App() {
  const [theme, setTheme] = useState("light");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState("Connect your wallet to start.");
  const [loading, setLoading] = useState(false);

  const [dexBalance, setDexBalance] = useState("0");
  const [ethBalance, setEthBalance] = useState("0");
  const [tokenPrice, setTokenPrice] = useState("0");
  const [ethReserve, setEthReserve] = useState("0");
  const [nftCount, setNftCount] = useState("0");
  const [nextTokenId, setNextTokenId] = useState("0");
  const [paymentCycle, setPaymentCycle] = useState("0");
  const [interestBps, setInterestBps] = useState("0");
  const [earlyFeeBps, setEarlyFeeBps] = useState("0");
  const [nftSaleFeeBps, setNftSaleFeeBps] = useState("0");
  const [pendingEth, setPendingEth] = useState("0");

  const [buyEthAmount, setBuyEthAmount] = useState("");
  const [sellDexAmount, setSellDexAmount] = useState("");
  const [mintUri, setMintUri] = useState("");
  const [burnTokenId, setBurnTokenId] = useState("");
  const [approveAll, setApproveAll] = useState(false);

  const [listTokenId, setListTokenId] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [listInDex, setListInDex] = useState(false);
  const [buyTokenId, setBuyTokenId] = useState("");
  const [buyValue, setBuyValue] = useState("");
  const [lookupListingTokenId, setLookupListingTokenId] = useState("");
  const [listingInfo, setListingInfo] = useState(null);

  const [auctionTokenId, setAuctionTokenId] = useState("");
  const [auctionMinPrice, setAuctionMinPrice] = useState("");
  const [auctionDuration, setAuctionDuration] = useState("");
  const [bidTokenId, setBidTokenId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [lookupAuctionTokenId, setLookupAuctionTokenId] = useState("");
  const [auctionInfo, setAuctionInfo] = useState(null);

  const [dexCollateral, setDexCollateral] = useState("");
  const [repayDexEth, setRepayDexEth] = useState("");

  const [loanTokenId, setLoanTokenId] = useState("");
  const [loanRequestedEth, setLoanRequestedEth] = useState("");
  const [loanInterest, setLoanInterest] = useState("");
  const [loanDuration, setLoanDuration] = useState("");
  const [fundTokenId, setFundTokenId] = useState("");
  const [fundDexBacking, setFundDexBacking] = useState("");
  const [repayNftTokenId, setRepayNftTokenId] = useState("");
  const [repayNftEth, setRepayNftEth] = useState("");
  const [claimDefaultTokenId, setClaimDefaultTokenId] = useState("");

  const contracts = useMemo(() => {
    if (!provider) return {};
    const dexRead = new ethers.Contract(DEX, DEX_ABI, provider);
    const nftRead = new ethers.Contract(NFT, NFT_ABI, provider);
    const marketRead = new ethers.Contract(MARKET, MARKET_ABI, provider);

    return {
      dexRead,
      nftRead,
      marketRead,
      dexWrite: signer ? dexRead.connect(signer) : null,
      nftWrite: signer ? nftRead.connect(signer) : null,
      marketWrite: signer ? marketRead.connect(signer) : null,
    };
  }, [provider, signer]);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = prefersDark ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (!accounts.length) {
        setWallet("");
        setSigner(null);
        setProvider(null);
        setStatus("Wallet disconnected.");
        return;
      }

      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const nextSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(nextSigner);
        setWallet(accounts[0]);
        setStatus("Active account changed.");
      } catch (error) {
        setWallet(accounts[0]);
        setSigner(null);
        setProvider(null);
        setStatus(
          error?.shortMessage || error?.message || "Failed to update active account."
        );
      }
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (!window.ethereum?.removeListener) return;
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

 useEffect(() => {
	async function load() {
	  if (!provider || !wallet) return;
	  await refreshData();
	}

	load();
  }, [provider, wallet, contracts]);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setStatus("MetaMask not found. Please install it first.");
        return;
      }

      setLoading(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const nextSigner = await browserProvider.getSigner();
      const address = await nextSigner.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(nextSigner);
      setWallet(address);

      if (network.chainId !== 31337n) {
        setStatus(
          `Wallet connected, but current chain is ${network.chainId.toString()}. Expected Hardhat localhost (31337).`
        );
      } else {
        setStatus("Wallet connected successfully.");
      }
    } catch (error) {
      setStatus(error?.shortMessage || error?.message || "Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    try {
      if (!provider || !wallet || !contracts.dexRead || !contracts.nftRead || !contracts.marketRead) {
        return;
      }

      setLoading(true);

		const [
		  ethBal,
		  dexBal,
		  price,
		  reserve,
		  nftBal,
		  nextId,
		  cycle,
		  interest,
		  earlyFee,
		  pending,
		] = await Promise.all([
		  provider.getBalance(wallet),
		  contracts.dexRead.balanceOf(wallet),
		  contracts.dexRead.tokenPrice(),
		  contracts.dexRead.getETHReserve(),
		  contracts.nftRead.balanceOf(wallet),
		  contracts.nftRead.getNextTokenId(),
		  contracts.marketRead.paymentCycle(),
		  contracts.marketRead.dexLoanInterestBps(),
		  contracts.marketRead.earlyCloseFeeBps(),
		  contracts.marketRead.pendingETHWithdrawals(wallet),
		]);

	  setNftSaleFeeBps(saleFee.toString());
      setEthBalance(ethBal.toString());
      setDexBalance(dexBal.toString());
      setTokenPrice(price.toString());
      setEthReserve(reserve.toString());
      setNftCount(nftBal.toString());
      setNextTokenId(nextId.toString());
      setPaymentCycle(cycle.toString());
      setInterestBps(interest.toString());
      setEarlyFeeBps(earlyFee.toString());
	  setPendingEth(pending.toString());

      try {
        const approved = await contracts.nftRead.isApprovedForAll(wallet, MARKET);
        setApproveAll(approved);
      } catch {
        setApproveAll(false);
      }

      setStatus("On-chain data refreshed.");
    } catch (error) {
      setStatus(error?.shortMessage || error?.message || "Failed to refresh on-chain data.");
    } finally {
      setLoading(false);
    }
  }

  async function runTx(action, successMessage) {
    try {
      setLoading(true);
      setStatus("Waiting for wallet confirmation...");
      const tx = await action();
      setStatus("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setStatus(successMessage);
      await refreshData();
    } catch (error) {
      setStatus(error?.shortMessage || error?.reason || error?.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }

  async function readListing() {
    try {
      if (!contracts.marketRead || !lookupListingTokenId) {
        setStatus("Enter a token ID to read the listing.");
        return;
      }

      const listing = await contracts.marketRead.listings(lookupListingTokenId);
      if (!listing || listing.seller === ethers.ZeroAddress) {
        setListingInfo(null);
        setStatus("Listing not found.");
        return;
      }
	  setListingInfo(listing);
      setStatus("Listing loaded.");
    } catch (error) {
      setListingInfo(null);
      setStatus(error?.shortMessage || error?.message || "Failed to read listing.");
    }
  }

  async function readAuction() {
    try {
      if (!contracts.marketRead || !lookupAuctionTokenId) {
        setStatus("Enter a token ID to read the auction.");
        return;
      }

      const auction = await contracts.marketRead.auctions(lookupAuctionTokenId);
      if (!auction || auction.seller === ethers.ZeroAddress) {
        setAuctionInfo(null);
        setStatus("Auction not found.");
        return;
      }
	  setAuctionInfo(auction);
      setStatus("Auction loaded.");
    } catch (error) {
      setAuctionInfo(null);
      setStatus(error?.shortMessage || error?.message || "Failed to read auction.");
    }
  }

  const pricePerDexEth = tokenPrice ? Number(ethers.formatEther(tokenPrice)) : 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <p className="eyebrow">DEX-NFT Pawning</p>
            <h1>PawnDEX</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer card subtle">
          <span className="label">Wallet</span>
          <strong>{shortAddress(wallet)}</strong>
          <span className="muted">Market contract</span>
          <code>{shortAddress(MARKET)}</code>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Academic DApp</p>
            <h2>{TABS.find((t) => t.key === activeTab)?.label}</h2>
          </div>

          <div className="topbar-actions">
            <button className="ghost-btn" onClick={toggleTheme}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button className="secondary-btn" onClick={refreshData} disabled={!wallet || loading}>
              Refresh
            </button>
            <button className="primary-btn" onClick={connectWallet} disabled={loading}>
              {wallet ? shortAddress(wallet) : "Connect wallet"}
            </button>
          </div>
        </header>

		  <section className="stats-grid">
			<article className="stat-card">
			  <span className="label">ETH balance</span>
			  <strong>{formatEth(ethBalance)} ETH</strong>
			</article>
			<article className="stat-card">
			  <span className="label">DEX balance</span>
			  <strong>{formatDex(dexBalance)} DEX</strong>
			</article>
			<article className="stat-card">
			  <span className="label">Owned NFTs</span>
			  <strong>{nftCount}</strong>
			</article>
			<article className="stat-card">
			  <span className="label">Next token ID</span>
			  <strong>{nextTokenId}</strong>
			</article>
			<article className="stat-card">
			  <span className="label">Pending ETH withdrawals</span>
			  <strong>{formatEth(pendingEth)} ETH</strong>
			</article>
		  </section>

        <section className="status-bar">
          <span className={`status-dot ${loading ? "is-loading" : "is-ready"}`} />
          <p>{status}</p>
        </section>

        {activeTab === "dashboard" && (
          <section className="dashboard-grid">
            <article className="card">
              <div className="card-head">
                <h3>Protocol overview</h3>
                <span className="pill">Live</span>
              </div>
				<div className="info-list">
				  <div>
					<span>DEX token price</span>
					<strong>{formatEth(tokenPrice)} ETH</strong>
				  </div>
				  <div>
					<span>DEX ETH reserve</span>
					<strong>{formatEth(ethReserve)} ETH</strong>
				  </div>
				  <div>
					<span>Payment cycle</span>
					<strong>{paymentCycle} sec</strong>
				  </div>
				  <div>
					<span>Interest</span>
					<strong>{interestBps} bps</strong>
				  </div>
				  <div>
					<span>Early close fee</span>
					<strong>{earlyFeeBps} bps</strong>
				  </div>
				  <div>
					<span>NFT sale fee</span>
					<strong>{nftSaleFeeBps} bps</strong>
				  </div>
				</div>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Contract addresses</h3>
                <span className="pill muted-pill">Localhost</span>
              </div>
              <div className="address-stack">
                <div>
                  <span>DEX</span>
                  <code>{DEX}</code>
                </div>
                <div>
                  <span>NFT</span>
                  <code>{NFT}</code>
                </div>
                <div>
                  <span>Market</span>
                  <code>{MARKET}</code>
                </div>
              </div>
            </article>

            <article className="card wide">
              <div className="card-head">
                <h3>Demo path</h3>
              </div>
              <ol className="steps">
                <li>Connect wallet and refresh balances.</li>
                <li>Buy DEX with ETH.</li>
                <li>Mint an NFT and approve the market.</li>
                <li>List the NFT or start an auction.</li>
                <li>Open a DEX-backed or NFT-backed loan.</li>
              </ol>
            </article>
          </section>
        )}

        {activeTab === "dex" && (
          <section className="panel-grid">
            <article className="card">
              <div className="card-head">
                <h3>Buy DEX</h3>
              </div>
              <p className="muted">Send ETH to buy tokens directly from the DEX contract.</p>
              <div className="field">
                <label>ETH amount</label>
                <input
                  value={buyEthAmount}
                  onChange={(e) => setBuyEthAmount(e.target.value)}
                  placeholder="0.10"
                />
              </div>
              <button
                className="primary-btn full"
                disabled={!contracts.dexWrite || !buyEthAmount || loading}
                onClick={() => {
                  const parsed = safeParseEth(buyEthAmount);
                  if (!parsed) {
                    setStatus("Enter a valid ETH amount.");
                    return;
                  }

                  runTx(
                    () => contracts.dexWrite.buyDEX({ value: parsed }),
                    "DEX purchased successfully."
                  );
                }}
              >
                Buy DEX
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Sell DEX</h3>
              </div>
              <p className="muted">Sell your DEX back to the contract for ETH.</p>
              <div className="field">
                <label>DEX amount</label>
                <input
                  value={sellDexAmount}
                  onChange={(e) => setSellDexAmount(e.target.value)}
                  placeholder="25"
                />
              </div>
              <button
                className="primary-btn full"
                disabled={!contracts.dexWrite || !sellDexAmount || loading}
                onClick={() => {
                  const parsed = safeParseDex(sellDexAmount);
                  if (!parsed) {
                    setStatus("Enter a valid DEX amount.");
                    return;
                  }

                  runTx(
                    () => contracts.dexWrite.sellDEX(parsed),
                    "DEX sold successfully."
                  );
                }}
              >
                Sell DEX
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Market metrics</h3>
              </div>
              <div className="info-list compact">
                <div>
                  <span>Token price</span>
                  <strong>{formatEth(tokenPrice)} ETH</strong>
                </div>
                <div>
                  <span>Reserve</span>
                  <strong>{formatEth(ethReserve)} ETH</strong>
                </div>
                <div>
                  <span>Approx. DEX per ETH</span>
                  <strong>{pricePerDexEth ? (1 / pricePerDexEth).toFixed(2) : "0.00"}</strong>
                </div>
              </div>
            </article>
          </section>
        )}

        {activeTab === "nfts" && (
          <section className="panel-grid">
            <article className="card">
              <div className="card-head">
                <h3>Mint NFT</h3>
              </div>
              <div className="field">
                <label>Metadata URI</label>
                <input
                  value={mintUri}
                  onChange={(e) => setMintUri(e.target.value)}
                  placeholder="ipfs://..."
                />
              </div>
              <button
                className="primary-btn full"
                disabled={!contracts.nftWrite || !mintUri || loading}
                onClick={() =>
                  runTx(() => contracts.nftWrite.mint(mintUri), "NFT minted successfully.")
                }
              >
                Mint NFT
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Burn NFT</h3>
              </div>
              <div className="field">
                <label>Token ID</label>
                <input
                  value={burnTokenId}
                  onChange={(e) => setBurnTokenId(e.target.value)}
                  placeholder="0"
                />
              </div>
              <button
                className="secondary-btn full"
                disabled={!contracts.nftWrite || burnTokenId === "" || loading}
                onClick={() => {
                  const tokenId = safeNumber(burnTokenId);
                  if (tokenId === null) {
                    setStatus("Enter a valid token ID.");
                    return;
                  }

                  runTx(
                    () => contracts.nftWrite.burn(tokenId),
                    "NFT burned successfully."
                  );
                }}
              >
                Burn NFT
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Marketplace approval</h3>
              </div>
              <p className="muted">Approve the market contract to move your NFTs.</p>
              <div className="approval-box">
                <span className={`pill ${approveAll ? "success-pill" : "warning-pill"}`}>
                  {approveAll ? "Approved for all" : "Not approved"}
                </span>
              </div>
              <button
                className="primary-btn full"
                disabled={!contracts.nftWrite || loading}
                onClick={() =>
                  runTx(
                    () => contracts.nftWrite.setApprovalForAll(MARKET, true),
                    "Marketplace approval granted."
                  )
                }
              >
                Approve market
              </button>
            </article>
          </section>
        )}

        {activeTab === "market" && (
          <section className="panel-grid">
            <article className="card">
              <div className="card-head">
                <h3>List NFT</h3>
              </div>
				<p className="muted">
				  Current NFT sale fee: {(Number(nftSaleFeeBps) / 100).toFixed(2)}%. The seller receives the remaining amount.
				</p>
              <div className="form-grid">
                <div className="field">
                  <label>Token ID</label>
                  <input
                    value={listTokenId}
                    onChange={(e) => setListTokenId(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Price</label>
                  <input
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="1.0"
                  />
                </div>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={listInDex}
                  onChange={(e) => setListInDex(e.target.checked)}
                />
                Sell in DEX instead of ETH
              </label>
              <button
                className="primary-btn full"
                disabled={!contracts.marketWrite || !listTokenId || !listPrice || loading}
                onClick={() => {
                  const tokenId = safeNumber(listTokenId);
                  const parsedPrice = listInDex ? safeParseDex(listPrice) : safeParseEth(listPrice);

                  if (tokenId === null) {
                    setStatus("Enter a valid token ID.");
                    return;
                  }
                  if (!parsedPrice) {
                    setStatus(`Enter a valid ${listInDex ? "DEX" : "ETH"} listing price.`);
                    return;
                  }

                  runTx(
                    () => contracts.marketWrite.listNFT(NFT, tokenId, parsedPrice, listInDex),
                    "NFT listed successfully."
                  );
                }}
              >
                Create listing
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Buy NFT</h3>
              </div>
              <div className="field">
                <label>Token ID</label>
                <input
                  value={buyTokenId}
                  onChange={(e) => setBuyTokenId(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label>Payment value (only for ETH purchases)</label>
                <input
                  value={buyValue}
                  onChange={(e) => setBuyValue(e.target.value)}
                  placeholder="1.0"
                />
              </div>
              <button
                className="primary-btn full"
                disabled={!contracts.marketWrite || !buyTokenId || loading}
                onClick={() => {
                  const tokenId = safeNumber(buyTokenId);
                  if (tokenId === null) {
                    setStatus("Enter a valid token ID.");
                    return;
                  }

                  const parsedValue = safeParseEth(buyValue);
                  if (buyValue && !parsedValue) {
                    setStatus("Enter a valid ETH value for the purchase.");
                    return;
                  }

                  runTx(
                    () =>
                      parsedValue
                        ? contracts.marketWrite.buyNFT(tokenId, { value: parsedValue })
                        : contracts.marketWrite.buyNFT(tokenId),
                    "NFT purchased successfully."
                  );
                }}
              >
                Buy listed NFT
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Read listing</h3>
              </div>
              <div className="field">
                <label>Token ID</label>
                <input
                  value={lookupListingTokenId}
                  onChange={(e) => setLookupListingTokenId(e.target.value)}
                  placeholder="0"
                />
              </div>
              <button
                className="secondary-btn full"
                disabled={!contracts.marketRead || !lookupListingTokenId || loading}
                onClick={readListing}
              >
                Load listing
              </button>

              {listingInfo && (
                <div className="info-list compact top-gap">
                  <div>
                    <span>Seller</span>
                    <strong>{shortAddress(listingInfo.seller)}</strong>
                  </div>
					<div>
					  <span>Price</span>
					  <strong>
						{listingInfo.price
						  ? listingInfo.inDEX
							? `${formatDex(listingInfo.price)} DEX`
							: `${formatEth(listingInfo.price)} ETH`
						  : "0"}
					  </strong>
					</div>
                  <div>
                    <span>In DEX</span>
                    <strong>{String(listingInfo.inDEX)}</strong>
                  </div>
                  <div>
                    <span>Active</span>
                    <strong>{String(listingInfo.active)}</strong>
                  </div>
                </div>
              )}
            </article>
          </section>
        )}

        {activeTab === "auctions" && (
          <section className="panel-grid">
                  <article className="card">
					<div className="card-head">
					  <h3>Start auction</h3>
					</div>
					<div className="form-grid">
					  <div className="field">
						<label>Token ID</label>
						<input
						  value={auctionTokenId}
						  onChange={(e) => setAuctionTokenId(e.target.value)}
						  placeholder="0"
						/>
					  </div>
					  <div className="field">
						<label>Min price (ETH)</label>
						<input
						  value={auctionMinPrice}
						  onChange={(e) => setAuctionMinPrice(e.target.value)}
						  placeholder="0.5"
						/>
					  </div>
					  <div className="field">
						<label>Duration (sec)</label>
						<input
						  value={auctionDuration}
						  onChange={(e) => setAuctionDuration(e.target.value)}
						  placeholder="3600"
						/>
					  </div>
					</div>
					<p className="muted">
					  Auctions accept ETH bids only; DEX bids are disabled in this version.
					</p>
					<button
					  className="primary-btn full"
					  disabled={
						!contracts.marketWrite ||
						!auctionTokenId ||
						!auctionMinPrice ||
						!auctionDuration ||
						loading
					  }
					  onClick={() =>
						runTx(
						  () =>
							contracts.marketWrite.startAuction(
							  NFT,
							  auctionTokenId,
							  ethers.parseEther(auctionMinPrice),
							  false, // inDEX = false, ETH-only
							  auctionDuration
							),
						  "Auction started successfully."
						)
					  }
					>
					  Start auction
					</button>
				  </article>

            <article className="card">
              <div className="card-head">
                <h3>Bid on auction</h3>
              </div>
              <div className="field">
                <label>Token ID</label>
                <input
                  value={bidTokenId}
                  onChange={(e) => setBidTokenId(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label>Bid amount</label>
                <input
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0.8"
                />
              </div>
              <button
                className="primary-btn full"
                disabled={!contracts.marketWrite || !bidTokenId || !bidAmount || loading}
                onClick={() => {
                  const tokenId = safeNumber(bidTokenId);
                  const parsedBid = safeParseEth(bidAmount);

                  if (tokenId === null) {
                    setStatus("Enter a valid token ID.");
                    return;
                  }
                  if (!parsedBid) {
                    setStatus("Enter a valid ETH bid amount.");
                    return;
                  }

                  runTx(
                    () => contracts.marketWrite.bid(tokenId, { value: parsedBid }),
                    "Bid placed successfully."
                  );
                }}
              >
                Place bid
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Read auction</h3>
              </div>
              <div className="field">
                <label>Token ID</label>
                <input
                  value={lookupAuctionTokenId}
                  onChange={(e) => setLookupAuctionTokenId(e.target.value)}
                  placeholder="0"
                />
              </div>
              <button
                className="secondary-btn full"
                disabled={!contracts.marketRead || !lookupAuctionTokenId || loading}
                onClick={readAuction}
              >
                Load auction
              </button>

			{auctionInfo && (
			  <div className="info-list compact top-gap">
				<div>
				  <span>Seller</span>
				  <strong>{shortAddress(auctionInfo.seller)}</strong>
				</div>
					<div>
					  <span>Min price</span>
					  <strong>{auctionInfo.minPrice ? `${formatEth(auctionInfo.minPrice)} ETH` : "0"}</strong>
					</div>
					<div>
					  <span>Highest bid</span>
					  <strong>{auctionInfo.highestBid ? `${formatEth(auctionInfo.highestBid)} ETH` : "0"}</strong>
					</div>
				<div>
				  <span>Highest bidder</span>
				  <strong>
					{auctionInfo.highestBidder && auctionInfo.highestBidder !== ethers.ZeroAddress
					  ? shortAddress(auctionInfo.highestBidder)
					  : "No bids yet"}
				  </strong>
				</div>
				<div>
				  <span>Ends at</span>
				  <strong>
					{auctionInfo.endTime
					  ? new Date(Number(auctionInfo.endTime) * 1000).toLocaleString()
					  : "0"}
				  </strong>
				</div>
				<div>
				  <span>In DEX</span>
				  <strong>{String(auctionInfo.inDEX)}</strong>
				</div>
				<div>
				  <span>Active</span>
				  <strong>{String(auctionInfo.active)}</strong>
				</div>
			  </div>
			)}
            </article>
          </section>
        )}

        {activeTab === "loans" && (
          <section className="panel-grid three">
            <article className="card">
              <div className="card-head">
                <h3>DEX-backed loan</h3>
              </div>
              <div className="field">
                <label>Collateral DEX</label>
                <input
                  value={dexCollateral}
                  onChange={(e) => setDexCollateral(e.target.value)}
                  placeholder="100"
                />
              </div>
              <button
                className="primary-btn full"
                disabled={!contracts.marketWrite || !dexCollateral || loading}
                onClick={() => {
                  const parsed = safeParseDex(dexCollateral);
                  if (!parsed) {
                    setStatus("Enter a valid DEX collateral amount.");
                    return;
                  }

                  runTx(
                    () => contracts.marketWrite.borrowETHWithDEX(parsed),
                    "DEX-backed loan opened."
                  );
                }}
              >
                Borrow ETH
              </button>

              <div className="field top-gap">
                <label>Repay ETH amount</label>
                <input
                  value={repayDexEth}
                  onChange={(e) => setRepayDexEth(e.target.value)}
                  placeholder="0.05"
                />
              </div>
              <button
                className="secondary-btn full"
                disabled={!contracts.marketWrite || !repayDexEth || loading}
                onClick={() => {
                  const parsed = safeParseEth(repayDexEth);
                  if (!parsed) {
                    setStatus("Enter a valid ETH repay amount.");
                    return;
                  }

                  runTx(
                    () => contracts.marketWrite.repayDEXLoan({ value: parsed }),
                    "DEX-backed loan repaid."
                  );
                }}
              >
                Repay DEX loan
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Request NFT loan</h3>
              </div>
				<p className="muted">
				  For NFT-backed loans, the lender receives half of the interest on repayment.
				  If the borrower defaults, the lender can claim the NFT collateral.
				</p>
              <div className="form-grid">
                <div className="field">
                  <label>Token ID</label>
                  <input
                    value={loanTokenId}
                    onChange={(e) => setLoanTokenId(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Requested ETH</label>
                  <input
                    value={loanRequestedEth}
                    onChange={(e) => setLoanRequestedEth(e.target.value)}
                    placeholder="0.2"
                  />
                </div>
                <div className="field">
                  <label>Interest bps</label>
                  <input
                    value={loanInterest}
                    onChange={(e) => setLoanInterest(e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div className="field">
                  <label>Duration (sec)</label>
                  <input
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(e.target.value)}
                    placeholder="86400"
                  />
                </div>
              </div>
              <button
                className="primary-btn full"
                disabled={
                  !contracts.marketWrite ||
                  !loanTokenId ||
                  !loanRequestedEth ||
                  !loanInterest ||
                  !loanDuration ||
                  loading
                }
                onClick={() => {
                  const tokenId = safeNumber(loanTokenId);
                  const requested = safeParseEth(loanRequestedEth);
                  const interest = safeNumber(loanInterest);
                  const duration = safeNumber(loanDuration);

                  if (tokenId === null) {
                    setStatus("Enter a valid token ID.");
                    return;
                  }
                  if (!requested) {
                    setStatus("Enter a valid requested ETH amount.");
                    return;
                  }
                  if (interest === null) {
                    setStatus("Enter a valid interest bps.");
                    return;
                  }
                  if (duration === null) {
                    setStatus("Enter a valid loan duration.");
                    return;
                  }

                  runTx(
                    () =>
                      contracts.marketWrite.requestNFTLoan(
                        NFT,
                        tokenId,
                        requested,
                        interest,
                        duration
                      ),
                    "NFT-backed loan requested."
                  );
                }}
              >
                Request NFT loan
              </button>
            </article>

            <article className="card">
              <div className="card-head">
                <h3>Fund / repay / claim</h3>
              </div>
              <div className="field">
                <label>Fund token ID</label>
                <input
                  value={fundTokenId}
                  onChange={(e) => setFundTokenId(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label>DEX backing</label>
                <input
                  value={fundDexBacking}
                  onChange={(e) => setFundDexBacking(e.target.value)}
                  placeholder="250"
                />
              </div>
              <button
                className="secondary-btn full"
                disabled={!contracts.marketWrite || !fundTokenId || !fundDexBacking || loading}
                onClick={() => {
                  const tokenId = safeNumber(fundTokenId);
                  const backing = safeParseDex(fundDexBacking);

                  if (tokenId === null) {
                    setStatus("Enter a valid token ID.");
                    return;
                  }
                  if (!backing) {
                    setStatus("Enter a valid DEX backing amount.");
                    return;
                  }

                  runTx(
                    () => contracts.marketWrite.fundNFTLoan(tokenId, backing),
                    "NFT loan funded."
                  );
                }}
              >
                Fund NFT loan
              </button>

              <div className="field top-gap">
                <label>Repay NFT loan token ID</label>
                <input
                  value={repayNftTokenId}
                  onChange={(e) => setRepayNftTokenId(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label>Repay ETH</label>
                <input
                  value={repayNftEth}
                  onChange={(e) => setRepayNftEth(e.target.value)}
                  placeholder="0.25"
                />
              </div>
              <button
                className="secondary-btn full"
                disabled={!contracts.marketWrite || !repayNftTokenId || !repayNftEth || loading}
                onClick={() => {
                  const tokenId = safeNumber(repayNftTokenId);
                  const repay = safeParseEth(repayNftEth);

                  if (tokenId === null) {
                    setStatus("Enter a valid token ID.");
                    return;
                  }
                  if (!repay) {
                    setStatus("Enter a valid ETH repay amount.");
                    return;
                  }

                  runTx(
                    () => contracts.marketWrite.repayNFTLoan(tokenId, { value: repay }),
                    "NFT loan repaid."
                  );
                }}
              >
                Repay NFT loan
              </button>

              <div className="field top-gap">
                <label>Claim default token ID</label>
                <input
                  value={claimDefaultTokenId}
                  onChange={(e) => setClaimDefaultTokenId(e.target.value)}
                  placeholder="0"
                />
              </div>
              <button
                className="danger-btn full"
                disabled={!contracts.marketWrite || !claimDefaultTokenId || loading}
                onClick={() => {
                  const tokenId = safeNumber(claimDefaultTokenId);
                  if (tokenId === null) {
                    setStatus("Enter a valid token ID.");
                    return;
                  }

                  runTx(
                    () => contracts.marketWrite.claimNFTDefault(tokenId),
                    "NFT default claimed."
                  );
                }}
              >
                Claim NFT default
              </button>
            </article>
			
			          <article className="card">
            <div className="card-head">
              <h3>Withdraw pending ETH</h3>
            </div>
            <p className="muted">
              Any ETH from sales, loans or auctions accumulates as pending balance.
              Withdraw it to your wallet.
            </p>
            <p className="field">
              <span className="label">Pending amount</span>
              <strong>{formatEth(pendingEth)} ETH</strong>
            </p>
            <button
              className="primary-btn full"
              disabled={!contracts.marketWrite || loading || pendingEth === "0"}
              onClick={() =>
                runTx(
                  () => contracts.marketWrite.withdrawETH(),
                  "Pending ETH withdrawn."
                )
              }
            >
              Withdraw ETH
            </button>
          </article>
          </section>
        )}
      </main>
    </div>
  );
}