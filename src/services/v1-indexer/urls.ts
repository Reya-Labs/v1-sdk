const baseUrl = 'https://api.voltz.xyz';

type Service = 'chain-information' | 'all-pools' | 'position-pnl';

export const getServiceUrl = (service: Service): string => {
  return `${baseUrl}/${service}`;
};
