import { ONE_YEAR_IN_SECONDS, ONE_360DAY_YEAR_IN_SECONDS } from '../constants';

export const sum = (values: number[]): number => {
  return values.reduce((total, value) => total + value, 0);
};

export const max = (values: number[]): number => {
  return Math.max(...values);
};

export const getAnnualizedTime = (startTimestamp: number, endTimestamp: number): number => {
  return (endTimestamp - startTimestamp) / ONE_YEAR_IN_SECONDS;
};

export const getAnnualizedTime360dayYear = (
  startTimestamp: number,
  endTimestamp: number,
): number => {
  return (endTimestamp - startTimestamp) / ONE_360DAY_YEAR_IN_SECONDS;
};
