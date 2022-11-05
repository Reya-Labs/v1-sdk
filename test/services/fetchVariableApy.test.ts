import { ethers, providers } from 'ethers';
import { fetchVariableApy } from '../../src/services/fetchVariableApy';
import { BaseRateOracleABI } from '../../src/ABIs';

jest.setTimeout(50000);

describe('variable apy fetching', () => {
  const provider = new providers.JsonRpcProvider('http://localhost:8545');
  const tests: [string, string, number][] = [
    ['Aave Lending Rate Oracle (aDAI)', '0x65F5139977C608C6C2640c088D7fD07fA17A0614', 0.7992],
    ['Compound Lending Rate Oracle (cDAI)', '0x919674d599D8df8dd9E7Ebaabfc2881089C5D91C', 0.9908],
    ['Rocket Rate Oracle', '0x41EcaAC9061F6BABf2D42068F8F8dAF3BA9644FF', 5.308],
    ['Lido Rate Oracle', '0xA667502bF7f5dA45c7b6a70dA7f0595E6Cf342D8', 5.6767],
    ['Aave Borrowing Rate Oracle (aWETH)', '0x8Fdd62e435039d69De862e267Cda02846c6c2f3c', 2.244],
    ['Compound Borrowing Rate Oracle (cDAI)', '0x2108488ee280E1e7bBA4bBFa306708B10B05d370', 2.6053],
  ];

  tests.forEach(([title, rateOracleAddress, result]) => {
    it(title, async () => {
      const rateOracle = new ethers.Contract(rateOracleAddress, BaseRateOracleABI, provider);
      const rateOracleID = await rateOracle.UNDERLYING_YIELD_BEARING_PROTOCOL_ID();
      const tokenAddress = await rateOracle.underlying();

      const variableApy = await fetchVariableApy({
        rateOracle,
        rateOracleID,
        tokenAddress,
        provider,
      });

      expect(variableApy).toBeCloseTo(result);
    });
  });
});
