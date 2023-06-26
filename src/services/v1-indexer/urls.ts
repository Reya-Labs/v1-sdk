const baseUrl = 'https://api.voltz.xyz';

type Service =
  | 'chain-information'
  | 'all-pools'
  | 'position-pnl'
  | 'voyage-V1'
  | 'fixed-rates'
  | 'variable-rates'
  | 'v1v2-pools'
  | 'portfolio-positions'
  | 'portfolio-position-details'
  | 'v1v2-trader-positions-by-pool'
  | 'v1v2-lp-positions-by-pool'
  | 'v1v2-positions';

export const getServiceUrl = (service: Service): string => {
  return `${baseUrl}/${service}`;
};
