const baseUrl = 'https://api.voltz.xyz';

type Service =
  | 'chain-information'
  | 'all-pools'
  | 'position-pnl'
  | 'voyage-V1'
  | 'fixed-rates'
  | 'variable-rates';

export const getServiceUrl = (service: Service): string => {
  return `${baseUrl}/${service}`;
};
