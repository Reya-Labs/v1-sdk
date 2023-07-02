import { getGLPPositionFinalBalance } from '../../../src';
import { expect } from 'chai';

describe('glp 28th june', () => {
  it(`get glp 28th june position final balance`, async () => {
    const finalBalance: number = await getGLPPositionFinalBalance({
      ownerAddress: '0x005ae102dd1ab7b2c56276ebbe32e6db43143f81',
      tickLower: -69060,
      tickUpper: 0,
    });
    expect(finalBalance).to.be.equal(0.03479374682);
  });

  it(`get glp 28th june position final balance (2)`, async () => {
    const finalBalance: number = await getGLPPositionFinalBalance({
      ownerAddress: '0x38c65b606aa1c0886bc1d16cfc400ae218b38d15',
      tickLower: -69060,
      tickUpper: 0,
    });
    expect(finalBalance).to.be.equal(2.772299279);
  });

  it(`get glp 28th june position final balance (3)`, async () => {
    const finalBalance: number = await getGLPPositionFinalBalance({
      ownerAddress: '0x36374ee7a7ec2a9ca99df05e310fd707f4c0a675',
      tickLower: -69060,
      tickUpper: 0,
    });
    expect(finalBalance).to.be.equal(0);
  });
});
