import { providers } from 'ethers';
import * as dotenv from 'dotenv';
import { getAMM } from '../scripts/getAMM';

import * as mainnetPools from '../pool-addresses/mainnet.json';
import { BorrowAMM } from '../src/entities/BorrowAMM/borrowAMM';
import { getPosition } from '../scripts/getPosition';

dotenv.config();
jest.setTimeout(50000);

describe('borrow amm', () => {
  const provider = new providers.JsonRpcProvider('http://localhost:8545');
  const userAddress = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

  ['borrow_aUSDC_v1', 'borrow_aETH_v1', 'borrow_cUSDT_v1', 'borrow_aETH_v2'].forEach((poolName) => {
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    it(`initialisation ${poolName}`, async () => {
      const amm = await getAMM({
        vammAddress: item.vamm,
        provider,
        signer: userAddress,
      });

      const borrowAmm = new BorrowAMM({
        id: amm.id,
        amm,
      });

      const position = await getPosition({
        amm,
        userAddress,
        tickLower: -69000,
        tickUpper: 69060,
      });

      await borrowAmm.init(position);
    });
  });
});
