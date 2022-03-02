import fetch from 'node-fetch';
import { ethers } from "ethers";

// TODO: compile v1-periphery to typechain and put in SDK repo
// import { Margin } from "../../typechain/Margin";


// REST calls to an external API

const getRates = async (symbol: string) => {
    // Establish parameters
    // Supported symbols: cDAI, cUSDC, aDAI, aUSDC
    const startTime = new Date("2021-06-01T00:00:00Z").toISOString();
    const endTime = new Date().toISOString();
    const resolution = "1H";

    // Build the query
    const base = `http://app.sense.finance/api/v0.1/rates/${symbol}/timeseries`;
    const query = `${base}?from=${startTime}&to=${endTime}&resolution=${resolution}`;

    // Fetch
    const rates = await fetch(query).then(resp => resp.json());
    return rates;
}


// JSONRPC calls to an external contract or the blockchain itself

const getProvider = async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    return provider;
}

const getCurrentBlock = async () => {
    const provider = await getProvider();
    const blockNumber = await provider.getBlockNumber();
    return blockNumber;
}

const getWalletBalance = async (address: string) => {
    const provider = await getProvider();
    const balanceInWei = await provider.getBalance(address);
    const balanceInEth = ethers.utils.formatEther(balanceInWei);
    return balanceInEth;
}

const getEnsName = async (address: string) => {
    const provider = await getProvider();
    const name = await provider.lookupAddress(address);
    if (name) {
        const resolvedAddress = await provider.resolveName(name);
        if (resolvedAddress == address) {
            return name;
        }
    }
}

const getAddressFromEnsName = async (name: string) => {
    const provider = await getProvider();
    const address = await provider.resolveName(name);
    return address;
}

const getAvatar = async (address: string) => {
    const provider = await getProvider();
    const avatar = await provider.getAvatar(address);
    return avatar;
}


// JSONRPC calls to the Voltz Periphery contracts

const getMinimumMarginRequirement = async (
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount: number,
    vammAddress: string
) => {
    // const minimumMarginRequirement = await Margin.callStatic.getMinimumMarginRequirement(recipient, tickLower, tickUpper, amount, vammAddress);
    // return minimumMarginRequirement;
}


// JSONRPC calls to the Voltz Core contracts

// TODO: Resource CRUD (pending transactions, misc account metadata)
// async function () {
// }


// debugging

void async function () {
    console.log('Hello, World')
    const ensName = "vitalik.eth";
    console.log(const address = await getAddressFromEnsName(ensName);
    console.log(await getRates("cDAI"));
    console.log(await getCurrentBlock());
    console.log(await getWalletBalance(ensName));
    console.log(await getEnsName(address));
    console.log();
    console.log();
    console.log();
    console.log();
    console.log(await getCurrentBlock());
}();
