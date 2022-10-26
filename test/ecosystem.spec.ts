import { providers } from 'ethers';
import * as dotenv from 'dotenv';

import * as mainnetPools from '../pool-addresses/mainnet.json';
import { getEcosystem } from '../scripts/getEcosystem';

dotenv.config();
jest.setTimeout(50000);

describe('ecosystem', () => {
  const provider = new providers.JsonRpcProvider('http://localhost:8545');
  const signer = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

  it('ecosystem init', async () => {
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

    await getEcosystem({
      whitelistedAMMs,
      provider,
      signer,
    });
  });
});
