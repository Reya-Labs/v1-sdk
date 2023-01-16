import { expect } from 'chai';
import * as sinon from 'sinon';
import axios from 'axios';
import { geckoEthToUsd } from '../../src/utils/priceFetch';

describe('ETH price fetch', () => {
  describe('fetch price 1', () => {
    it('fetches price directly', async () => {
      sinon.stub(axios, 'get').resolves({
        data: {
          ethereum: {
            usd: 1000,
          },
        },
      });

      const price = await geckoEthToUsd('');
      expect(price).to.be.eq(1000);

      (axios.get as sinon.SinonStub).restore();
    });
  });
});
