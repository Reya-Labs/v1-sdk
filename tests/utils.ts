import { expect } from 'chai';

export const fail = (): void => {
  expect(true).to.be.eq(false);
};
