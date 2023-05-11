// const baseUrl = 'https://api.voltz.xyz';

// todo: change it to prod
const baseUrl = '//localhost:8080';

type Service = 'chain-information' | 'chain-pools' | 'position-pnl';

export const getServiceUrl = (service: Service): string => {
  return `${baseUrl}/${service}`;
};
