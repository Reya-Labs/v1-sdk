import { DEPOSIT_WINDOW } from '../../../constants';

export const closeOrPastMaturity = (timestampMS: number): boolean => {
  return Date.now().valueOf() + DEPOSIT_WINDOW > timestampMS;
};
