import { ethers } from "ethers";
import fetch from "node-fetch";
import { CacheContainer } from 'node-ts-cache'
import { MemoryStorage } from 'node-ts-cache-storage-memory'

const cache = new CacheContainer(new MemoryStorage())

export abstract class Rpc {

    private constructor() { }

    // REST calls to an external API

    // Wraps https://docs.sense.finance/rates-api/#series
    public static async getHistoricalRates(symbol: string, startDate: string, endDate: string): Promise<string> {
        // Supported symbols: cDAI, cUSDC, aDAI, aUSDC
        const startTime = new Date(startDate).toISOString();
        const endTime = new Date(endDate).toISOString();
        const resolution = "1D";
        const base = `https://app.sense.finance/api/v0.1/rates/${symbol}/series`;
        const query = `${base}?from=${startTime}&to=${endTime}&resolution=${resolution}`;
        const cachedRates = await cache.getItem<string>(query);
        if (cachedRates) {
            return cachedRates;
        }
        try {
            const rates = await fetch(query).then((resp: any) => resp.json());
            await cache.setItem(query, rates, { isCachedForever: true });   // ttl?
            return rates;
        } catch (err) {
            console.error(err);
            throw new Error(`Error fetching historical rates for ${symbol}`);
        }
    }

    // Wraps https://docs.sense.finance/rates-api/#latest
    public static async getLatestRates(symbol: string): Promise<string> {
        // Supported symbols: cDAI, cUSDC, aDAI, aUSDC
        const query = `https://app.sense.finance/api/v0.1/rates/${symbol}/latest`;
        const cachedRates = await cache.getItem<string>(query);
        if (cachedRates) {
            console.log(`Cache hit for key ${query}`);
            return cachedRates;
        }
        const rates = await fetch(query).then((resp: any) => resp.json());
        await cache.setItem(query, rates, { ttl: 60 }); // ttl?
        return rates;
    }

    // JSON RPC calls to the blockchain

    public static getProvider(network: string): ethers.providers.JsonRpcProvider {
        const provider = new ethers.providers.JsonRpcProvider(network);
        return provider;
    }

    public static async getCurrentBlock(network: string): Promise<number> {
        const provider = Rpc.getProvider(network);
        const blockNumber = await provider.getBlockNumber();
        return blockNumber;
    }

    public static async getEnsName(network: string, address: string): Promise<string> {
        const provider = Rpc.getProvider(network);
        const name = await provider.lookupAddress(address);
        if (name) {
            const resolvedAddress = await provider.resolveName(name);
            if (resolvedAddress == address) {
                return name;
            }
        }
        return "";
    }

    public static async getAddressFromEnsName(network: string, name: string): Promise<null | string> {
        const provider = Rpc.getProvider(network);
        const address = await provider.resolveName(name);
        return address;
    }

    public static async getWalletBalance(network: string, address: string): Promise<string> {
        const provider = Rpc.getProvider(network);
        const balanceInWei = await provider.getBalance(address);
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return balanceInEth;
    }

    public static async getAvatar(network: string, address: string): Promise<null | string> {
        const provider = await Rpc.getProvider(network);
        const avatar = await provider.getAvatar(address);
        return avatar;
    }

}
