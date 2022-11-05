import { getAdditionalMargin } from '../../src/services/getAdditionalMargin';

jest.setTimeout(50000);

describe('additional margin calculator', () => {
  const tests: [string, [number, number, number], number][] = [
    ['test 1', [0, 0, 0], 0],
    ['test 2', [0, 0, 1], 1.01],
    ['test 3', [1, 0, 0], 1.01],
    ['test 4', [1, 0, 1], 2.02],
    ['test 5', [1, 1, 1], 1.02],
    ['test 6', [100000000, 1, 1], 101000000.01],
    ['test 7', [100000000, 200000000, 1], 0],
  ];

  tests.forEach(([title, [requiredMargin, currentMargin, fee], result]) => {
    it(title, async () => {
      const additionalMargin = getAdditionalMargin({
        requiredMargin,
        currentMargin,
        fee,
      });

      expect(additionalMargin).toBeCloseTo(result);
    });
  });
});
