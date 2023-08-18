const BigNumber = require('bignumber.js');
const qs = require('qs');
const web3 = require('web3');

let currentTrade = {};
let currentSelectSide;
let tokens;

async function init() {
    await listAvailableTokens();
}

async function listAvailableTokens() {
    console.log("initializing");
    let response = await fetch('https://tokens.coingecko.com/uniswap/all.json');
    let tokenListJSON = await response.json();
    console.log("listing available tokens: ", tokenListJSON);
    tokens = tokenListJSON.tokens;
    console.log("tokens: ", tokens);

    // Create token list for modal
    let parent = document.getElementById("token_list");
    for (const i in tokens) {
        // Token row in the modal token list
        let div = document.createElement("div");
        div.className = "token_row";
        let html = `
        <img class="token_list_img" src="${tokens[i].logoURI}">
          <span class="token_list_text">${tokens[i].symbol}</span>
          `;
        div.innerHTML = html;
        div.onclick = () => {
            selectToken(tokens[i]);
        };
        parent.appendChild(div);
    };
}

async function selectToken(token) {
    closeModal();
    currentTrade[currentSelectSide] = token;
    console.log("currentTrade: ", currentTrade);
    renderInterface();
}

function renderInterface() {
    if (currentTrade.from) {
        console.log(currentTrade.from)
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
    }
    if (currentTrade.to) {
        console.log(currentTrade.to)
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    }
}

async function connect() {
    if (typeof window.ethereum !== "undefined") {
        try {
            console.log("connecting");
            await ethereum.request({ method: "eth_requestAccounts" });
        } catch (error) {
            console.log(error);
        }
        document.getElementById("login_button").innerHTML = "Connected";
        // const accounts = await ethereum.request({ method: "eth_accounts" });
        document.getElementById("swap_button").disabled = false;
    } else {
        document.getElementById("login_button").innerHTML = "Please install MetaMask";
    }
}

function openModal(side) {
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block";
}

function closeModal() {
    document.getElementById("token_modal").style.display = "none";
}

async function getPrice() {
    console.log("Getting Price");

    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);

    const params = {
        sellToken: currentTrade.from.address,
        buyToken: currentTrade.to.address,
        sellAmount: amount,
    }

    const headers = { "0x-api-key": "bbd5e041-5987-4f58-be53-e1ae9386deee" }; // This is a placeholder. Get your live API key from the 0x Dashboard (https://dashboard.0x.org/apps)

    // Fetch the swap price.
    const response = await fetch(`https://api.0x.org/swap/v1/price?${qs.stringify(params)}`, { headers });

    swapPriceJSON = await response.json();
    console.log("Price: ", swapPriceJSON);
    // Calculate and display the percentage breakdown
    const sourcesResponse = swapPriceJSON.sourcesResponse;
    if (sourcesResponse) {
        const sources = Object.keys(sourcesResponse);
        const total = sources.reduce((total, source) => total + sourcesResponse[source], 0);
        const breakdown = sources.map(source => `${(sourcesResponse[source] / total * 100).toFixed(2)}% ${source}`).join(", ");
        document.getElementById("sources_breakdown").textContent = `Sources: ${breakdown}`;
    }
    document.getElementById("to_amount").value = swapPriceJSON.buyAmount / (10 ** currentTrade.to.decimals);
    // Calculate and display the estimated gas cost in dollars
    const gasPrice = await web3.eth.getGasPrice();
    const estimatedGasCost = web3.utils.fromWei((swapPriceJSON.estimatedGas * gasPrice).toString(), "ether");
    document.getElementById("gas_estimate").textContent = `Estimated Gas: ${estimatedGasCost} ETH`;
}

async function getQuote(account) {
    console.log("Getting Quote");

    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);

    const params = {
        sellToken: currentTrade.from.address,
        buyToken: currentTrade.to.address,
        sellAmount: amount,
        takerAddress: account,
    }

    const headers = { "0x-api-key": "bbd5e041-5987-4f58-be53-e1ae9386deee" }; // This is a placeholder. Get your live API key from the 0x Dashboard (https://dashboard.0x.org/apps)

    // Fetch the swap quote.
    const response = await fetch(`https://api.0x.org/swap/v1/quote?${qs.stringify(params)}`, { headers });

    swapQuoteJSON = await response.json();
    console.log("Quote: ", swapQuoteJSON);

    document.getElementById("to_amount").value = swapQuoteJSON.buyAmount / (10 ** currentTrade.to.decimals);
    document.getElementById("gas_estimate").innerHTML = swapQuoteJSON.estimatedGas;

    return swapQuoteJSON;
}
function filterTokens(searchTerm) {
    const filteredTokens = tokens.filter(token =>
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Create token list for modal
    let parent = document.getElementById("token_list");
    for (const i in filteredTokens) {
        // Token row in the modal token list
        let div = document.createElement("div");
        div.className = "token_row";
        let html = `
        <img class="token_list_img" src="${filteredTokens[i].logoURI}">
          <span class="token_list_text">${filteredTokens[i].symbol}</span>
          `;
        div.innerHTML = html;
        div.onclick = () => {
            selectToken(filteredTokens[i]);
        };
        parent.appendChild(div);
    };
}

async function trySwap() {
    const erc20abi = [{ "inputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "string", "name": "symbol", "type": "string" }, { "internalType": "uint256", "name": "max_supply", "type": "uint256" }], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burnFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "subtractedValue", "type": "uint256" }], "name": "decreaseAllowance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "addedValue", "type": "uint256" }], "name": "increaseAllowance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }]
    console.log("trying swap");

    // Only work if MetaMask is connect
    // Connecting to Ethereum: Metamask
    
    const web3 = new web3.Web3(web3.Web3.givenProvider);

    // The address, if any, of the most recently used account that the caller is permitted to access
    let accounts = await ethereum.request({ method: "eth_accounts" });
    let takerAddress = accounts[0];
    console.log("takerAddress: ", takerAddress);

    const swapQuoteJSON = await getQuote(takerAddress);

    // Calculate exact allowance based on swap amount
    const allowanceAmount = new BigNumber(amount).plus(swapQuoteJSON.protocolFee);

    // Set Token Allowance
    const fromTokenAddress = currentTrade.from.address;
    const ERC20TokenContract = new web3.eth.Contract(erc20abi, fromTokenAddress);

    // Approve only the calculated allowance amount
    const tx = await ERC20TokenContract.methods.approve(
        swapQuoteJSON.allowanceTarget,
        allowanceAmount.toFixed(0), // Convert BigNumber to string
    ).send({ from: takerAddress });
    // Perform the swap
    const receipt = await web3.eth.sendTransaction(swapQuoteJSON);
    console.log("receipt: ", receipt);
}

init();
console.log("hello");
document.getElementById("login_button").onclick = connect;
document.getElementById("from_token_select").onclick = () => {
    openModal("from");
};
document.getElementById("to_token_select").onclick = () => {
    openModal("to");
};
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_amount").onblur = getPrice;
document.getElementById("to_amount").onblur = getPrice;
document.getElementById("to_amount").addEventListener("input", getPrice);
// Add an event listener to the search input
document.getElementById("token_search").addEventListener("input", function () {
    const searchTerm = this.value;
    filterTokens(searchTerm);
});
document.getElementById("swap_button").onclick = trySwap;
