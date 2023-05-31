const baseUrl = 'https://api.voltz.xyz';

type Service =
  | 'chain-information'
  | 'all-pools'
  | 'position-pnl'
  | 'voyage-V1'
  | 'fixed-rates'
  | 'variable-rates'
  | 'portfolio-positions';

export const getServiceUrl = (service: Service): string => {
  return `${baseUrl}/${service}`;
};
