import { getGLPPositionFinalBalance } from '../../../src';
import { expect } from 'chai';

describe('glp 28th june', () => {
  it(`get glp 28th june position final balance`, async () => {
    const finalBalance = await getGLPPositionFinalBalance({
      ownerAddress: '0x005ae102dd1ab7b2c56276ebbe32e6db43143f81',
      tickLower: -69060,
      tickUpper: 0,
    });
    expect(finalBalance).to.be.equal(0.03479374682);
  });
});
