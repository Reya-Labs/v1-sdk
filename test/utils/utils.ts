import * as mainnetPools from '../../pool-addresses/mainnet.json';

export const mapPoolNamesToIDs = (names: string[]): string[] => {
  return names.map((name) => {
    const pool = mainnetPools[name as keyof typeof mainnetPools];
    return pool.vamm.toLowerCase();
  });
};

export const fail = (): void => {
  expect(true).toEqual(false);
};
