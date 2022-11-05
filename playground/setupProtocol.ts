// This represents an example of how to setup the protocol.

import { providers } from 'ethers';
import * as dotenv from 'dotenv';
import { Protocol } from '../src/entities/Protocol/protocol';
import * as mainnetPools from '../pool-addresses/mainnet.json';

dotenv.config();

const whitelistedAMMs = [
  'stETH_v1',
  'rETH_v1',
  'borrow_aUSDC_v1',
  'borrow_aETH_v1',
  'borrow_cUSDT_v1',
  'aDAI_v3',
  'borrow_aETH_v2',
  'aETH_v1',
  'aUSDC_v3',
  'cDAI_v3',
].map((item) => mainnetPools[item as keyof typeof mainnetPools].vamm.toLowerCase());

const protocol = new Protocol({
  factoryAddress: '0x6a7a5c3824508D03F0d2d24E0482Bea39E08CcAF',
  provider: new providers.JsonRpcProvider('http://localhost:8545'),
  lpWhitelistedAmms: whitelistedAMMs,
  traderWhitelistedAmms: whitelistedAMMs,
  graphEndpoint: process.env.REACT_APP_SUBGRAPH_URL || '',
  coingeckoApiKey: process.env.REACT_APP_COINGECKO_API_KEY || '',
});

const setup = async () => {
  await protocol.onLand();
  if (!(protocol.allPools.length === 10)) {
    throw new Error('Pools have not been initialized.');
  }

  await protocol.onConnect('0xF8F6B70a36f4398f0853a311dC6699Aba8333Cc1');
  if (!(protocol.allPositions.length >= 20)) {
    throw new Error('Positions have not been initialized.');
  }

  if (!(protocol.allBorrowPools.length === 4)) {
    throw new Error('Borrow pools have not been initialized.');
  }
};

setup();
