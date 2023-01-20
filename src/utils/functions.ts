export const sum = (values: number[]): number => {
  return values.reduce((total, value) => total + value, 0);
};

export const max = (values: number[]): number => {
  return Math.max(...values);
};
