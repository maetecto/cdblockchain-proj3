import { useState } from "react";
import { ethers } from "ethers";

import {
DEX,
NFT,
MARKET
}
from "./contracts";

function App() {

const [wallet,setWallet]=
useState("");

async function connectWallet(){

if(!window.ethereum){

alert(
"Install MetaMask"
);

return;

}

const provider=

new ethers
.BrowserProvider(

window.ethereum

);

const signer=

await provider
.getSigner();

setWallet(

await signer
.getAddress()

);

}

return(

<div
style={{

padding:"40px"

}}
>

<h1>

DEX NFT Pawning DApp

</h1>

<button

onClick={
connectWallet
}

>

Connect Wallet

</button>

<p>

{wallet}

</p>

<hr/>

<h2>

Contracts

</h2>

<p>

DEX:

{DEX}

</p>

<p>

NFT:

{NFT}

</p>

<p>

Market:

{MARKET}

</p>

</div>

);

}

export default App;