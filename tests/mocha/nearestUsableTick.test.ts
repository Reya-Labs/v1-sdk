import { expect } from 'chai';
import { nearestUsableTick } from '../../src/utils/nearestUsableTick';
import { TickMath } from '../../src/utils/tickMath';
import { fail } from '../utils';

describe('#nearestUsableTick', () => {
  it('throws if tickSpacing is 0', () => {
    try {
      nearestUsableTick(1, 0);
      fail();
    } catch (error) {
      expect((error as Error).message).to.be.eq('Invariant failed: TICK_SPACING');
    }
  });

  it('throws if tickSpacing is negative', () => {
    try {
      nearestUsableTick(1, -5);
      fail();
    } catch (error) {
      expect((error as Error).message).to.be.eq('Invariant failed: TICK_SPACING');
    }
  });

  it('throws if either is non-integer', () => {
    try {
      nearestUsableTick(1.5, 1);
      fail();
    } catch (error) {
      expect((error as Error).message).to.be.eq('Invariant failed: INTEGERS');
    }

    try {
      nearestUsableTick(1, 1.5);
      fail();
    } catch (error) {
      expect((error as Error).message).to.be.eq('Invariant failed: INTEGERS');
    }
  });

  it('throws if tick is greater than TickMath.MAX_TICK', () => {
    try {
      nearestUsableTick(TickMath.MAX_TICK + 1, 1);
      fail();
    } catch (error) {
      expect((error as Error).message).to.be.eq('Invariant failed: TICK_BOUND');
    }

    try {
      nearestUsableTick(TickMath.MIN_TICK - 1, 1);
      fail();
    } catch (error) {
      expect((error as Error).message).to.be.eq('Invariant failed: TICK_BOUND');
    }
  });

  it('rounds at positive half', () => {
    expect(nearestUsableTick(5, 10)).to.be.eq(10);
  });

  it('rounds down below positive half', () => {
    expect(nearestUsableTick(4, 10)).to.be.eq(0);
  });

  it('rounds up for negative half', () => {
    expect(nearestUsableTick(-5, 10)).to.be.eq(-0);
  });

  it('rounds up for negative half', () => {
    expect(nearestUsableTick(-6, 10)).to.be.eq(-10);
  });

  it('cannot round past MIN_TICK', () => {
    expect(nearestUsableTick(TickMath.MIN_TICK, TickMath.MAX_TICK / 2 + 100)).to.be.eq(
      -(TickMath.MAX_TICK / 2 + 100),
    );
  });

  it('cannot round past MAX_TICK', () => {
    expect(nearestUsableTick(TickMath.MAX_TICK, TickMath.MAX_TICK / 2 + 100)).to.be.eq(
      TickMath.MAX_TICK / 2 + 100,
    );
  });
});
