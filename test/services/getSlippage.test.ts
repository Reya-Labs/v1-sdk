import { getSlippage } from '../../src/services/getSlippage';

jest.setTimeout(50000);

describe('slippage calculator', () => {
  const tests: [string, [number, number], number][] = [
    ['test 1', [0, 0], 0],
    ['test 2.1', [0, 7000], 0.5034],
    ['test 2.2', [7000, 0], 0.5034],
    ['test 3.1', [-7000, 0], 1.0136],
    ['test 3.2', [0, -7000], 1.0136],
    ['test 4.1', [-7000, 7000], 1.517],
    ['test 4.2', [7000, -7000], 1.517],
  ];

  tests.forEach(([title, [tickLower, tickUpper], result]) => {
    it(title, async () => {
      const slippage = getSlippage(tickLower, tickUpper);

      expect(slippage).toBeCloseTo(result);
    });
  });
});
