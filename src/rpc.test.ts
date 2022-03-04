import { Rpc } from './rpc'

describe('Rpc', () => {

    const network = "https://eth-mainnet.alchemyapi.io/v2/pNmKK8pTXHVggw2X4XPAOOuL9SllmxdZ";
    const ensName = "vitalik.eth";
    const ethAddress = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

    it('can fetch historical rates for cDAI', async () => {
        const symbol = "cDAI";
        const startDate = "2021-06-01T00:00:00Z";
        const endDate = "2021-06-02T00:00:00Z";
        const series = await Rpc.getHistoricalRates(symbol, startDate, endDate);
        const rate = series[0];
        const iso_date_string = rate[0];
        const apy = rate[1];
        const tal = rate[2];
        expect(iso_date_string).toEqual("2021-06-01T00:00:00.000Z");
        expect(apy).toEqual(2.772343158721924);
        expect(tal).toEqual(3259980032);
    });

    // it('throws an error when fetching historical rates for INVALID_SYMBOL', async () => {
    //     const symbol = "INVALID_SYMBOL";
    //     const startDate = "2021-06-01T00:00:00Z";
    //     const endDate = "2021-06-02T00:00:00Z";
    //     // await expect(Rpc.getHistoricalRates(symbol, startDate, endDate)).rejects.toThrow("sdfsdf");
    //     const series = await Rpc.getHistoricalRates(symbol, startDate, endDate);
    //     const rate = series[0];
    //     const iso_date_string = rate[0];
    //     const apy = rate[1];
    //     const tal = rate[2];
    //     expect(iso_date_string).toEqual("2021-06-01T00:00:00.000Z");
    //     expect(apy).toEqual(2.772343158721924);
    //     expect(tal).toEqual(3259980032);
    // });

    it('can fetch latest rates for cDAI', async () => {
        const symbol = "cDAI";
        const latest = await Rpc.getLatestRates(symbol); //.then((resp: any) => resp.json());
        const ticker = latest["ticker"];
        const block = latest["block_num"];
        const earn = latest["earn"];
        const borrow = latest["borrow"];
        expect(ticker).toEqual(symbol);
        expect(block).toBeGreaterThan(0);
        expect(earn).toBeGreaterThan(0);
        expect(borrow).toBeGreaterThan(0);
    });

    it('can get the current block number', async () => {
        const currentBlock = await Rpc.getCurrentBlock(network);
        expect(currentBlock).toBeGreaterThan(0);
    });

    it('can get the ens name for vitalik', async () => {
        const name = await Rpc.getEnsName(network, ethAddress);
        expect(name).toBe(ensName);
    });

    it('can get the wallet balance for vitalik', async () => {
        const walletBalance = await Rpc.getWalletBalance(network, ensName);
        expect(walletBalance).toBeGreaterThan(0);
    });

})
