const baseUrl = 'https://api.voltz.xyz';

export const getServiceUrl = (service: string): string => {
  return `${baseUrl}/${service}`;
};
