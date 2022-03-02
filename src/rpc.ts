import { ethers } from "ethers";
import fetch from "node-fetch";
import { CacheContainer } from 'node-ts-cache'
import { MemoryStorage } from 'node-ts-cache-storage-memory'

const cache = new CacheContainer(new MemoryStorage())

// TODO: import Margin entity


// REST calls to an external API

const getHistoricalRates = async (symbol: string) => {
    // Supported symbols: cDAI, cUSDC, aDAI, aUSDC
    const startTime = new Date("2021-06-01T00:00:00Z").toISOString();
    const endTime = new Date().toISOString();
    const resolution = "1D";
    const base = `https://app.sense.finance/api/v0.1/rates/${symbol}/timeseries`;
    const query = `${base}?from=${startTime}&to=${endTime}&resolution=${resolution}`;
    // console.log(query);
    const cachedRates = await cache.getItem<string[]>(query);
    if (cachedRates) {
        return cachedRates;
    }
    try {
        const rates = await fetch(query).then((resp: any) => resp.json());
        await cache.setItem(query, rates, { isCachedForever: true });   // ttl?
        return rates;
    } catch (err) {
        console.error(err);
    }
}

const getLatestRates = async (symbol: string) => {
    // Supported symbols: cDAI, cUSDC, aDAI, aUSDC
    const query = `https://app.sense.finance/api/v0.1/rates/${symbol}/latest`;
    const cachedRates = await cache.getItem<string[]>(query);
    if (cachedRates) {
        console.log(`Cache hit for key ${query}`);
        return cachedRates;
    }
    const rates = await fetch(query).then((resp: any) => resp.json());
    // const rates = await fetch(query);
    await cache.setItem(query, rates, { ttl: 60 });
    return rates;
}


// JSONRPC calls to an external contract or the blockchain itself

const getProvider = async (network: string) => {
    const provider = new ethers.providers.JsonRpcProvider(network);
    return provider;
}

const getCurrentBlock = async (network: string) => {
    const provider = await getProvider(network);
    const blockNumber = await provider.getBlockNumber();
    return blockNumber;
}

const getWalletBalance = async (network: string, address: string) => {
    const provider = await getProvider(network);
    const balanceInWei = await provider.getBalance(address);
    const balanceInEth = ethers.utils.formatEther(balanceInWei);
    return balanceInEth;
}

const getEnsName = async (network: string, address: string) => {
    const provider = await getProvider(network);
    const name = await provider.lookupAddress(address);
    if (name) {
        const resolvedAddress = await provider.resolveName(name);
        if (resolvedAddress == address) {
            return name;
        }
    }
}

const getAddressFromEnsName = async (network: string, name: string) => {
    const provider = await getProvider(network);
    const address = await provider.resolveName(name);
    return address;
}

const getAvatar = async (network: string, address: string) => {
    const provider = await getProvider(network);
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


void async function () {
    const network = "https://eth-mainnet.alchemyapi.io/v2/pNmKK8pTXHVggw2X4XPAOOuL9SllmxdZ";
    const ensName = "vitalik.eth";
    console.log(`Current block: ${await getCurrentBlock(network)}`);
    let address = await getAddressFromEnsName(network, ensName);
    console.log(`Address: ${address}`);
    address = address || "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
    console.log(`Wallet balance: ${await getWalletBalance(network, ensName)}`);
    console.log(`ENS name: ${await getEnsName(network, address)}`);
    console.log(`Avatar: ${await getAvatar(network, address)}`);
    console.log(`Historical Rates: %j`, await getHistoricalRates("cDAI"));
    console.log(`Latest Rates: %j`, await getLatestRates("cDAI"));
    console.log(`Latest Rates: %j`, await getLatestRates("cDAI"));
}();
