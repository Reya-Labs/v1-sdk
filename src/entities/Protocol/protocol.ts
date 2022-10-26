import { providers, Signer } from 'ethers';
import { BorrowAMM } from '../BorrowAMM/borrowAMM';
import { Position } from '../Position/position';
import { AMM } from '../AMM/amm';
import { getGraphAMMs } from '../../../graph-queries/amms';
import { getGraphPositions } from '../../../graph-queries/positions';

import * as mainnetPools from '../../../pool-addresses/mainnet.json';
import { graphAMMsResponseToAMMs, graphPositionsResponseToPositions } from './mappings';

export class Protocol {
  public readonly lpWhitelistedAmms: Set<string>;
  public readonly traderWhitelistedAmms: Set<string>;
  public readonly allAmms: Set<string>;
  public readonly factoryAddress: string;
  public readonly provider?: providers.Provider;

  public amms: AMM[] = [];
  public positions: Position[] = [];
  public borrowAmms: BorrowAMM[] = [];

  public constructor({
    factoryAddress,
    provider,
    lpWhitelistedAmms,
    traderWhitelistedAmms,
  }: {
    factoryAddress: string;
    provider?: providers.Provider;
    lpWhitelistedAmms: string[];
    traderWhitelistedAmms: string[];
  }) {
    this.lpWhitelistedAmms = new Set<string>(lpWhitelistedAmms.map((item) => item.toLowerCase()));
    this.traderWhitelistedAmms = new Set<string>(
      traderWhitelistedAmms.map((item) => item.toLowerCase()),
    );
    this.allAmms = new Set<string>(
      lpWhitelistedAmms.concat(traderWhitelistedAmms).map((item) => item.toLowerCase()),
    );
    this.factoryAddress = factoryAddress;
    this.provider = provider;
  }

  onLand = async (): Promise<void> => {
    const ammAddresses = Array.from(this.allAmms).reduce(
      (bag: string, val: string, i) => (i === 0 ? `"${val}"` : `${bag},"${val}"`),
      '',
    );

    const cond = `where: {id_in:[${ammAddresses}]}`;
    const graphAMMs = await getGraphAMMs(cond);
    this.amms = graphAMMsResponseToAMMs(graphAMMs, this.factoryAddress, this.provider);

    await Promise.allSettled(this.amms.map((amm) => amm.init()));
  };

  onConnect = async (signer: Signer | string): Promise<void> => {
    await Promise.allSettled(this.amms.map((amm) => amm.init(signer)));

    const userAddress = typeof signer === 'string' ? signer : await signer.getAddress();

    const ammAddresses = Array.from(this.allAmms).reduce(
      (bag: string, val: string, i) => (i === 0 ? `"${val}"` : `${bag},"${val}"`),
      '',
    );
    const cond = `where: {owner: "${userAddress.toLowerCase()}", amm_in: [${ammAddresses}]}`;

    const graphPositions = await getGraphPositions(cond);
    this.positions = graphPositionsResponseToPositions(graphPositions, this);

    await Promise.allSettled(this.positions.map((position) => position.init()));

    this.borrowAmms = this.amms
      .filter((amm) => amm.rateOracleID === 5 || amm.rateOracleID === 6)
      .map((amm) => {
        return new BorrowAMM({
          id: amm.id,
          amm,
        });
      });

    await Promise.allSettled(
      this.borrowAmms.map((borrowAMM) => {
        const borrowPositionId = `${
          borrowAMM.amm.id
        }#${userAddress.toLowerCase()}#${-69000}#${69060}`;

        const borrowPosition = this.findPosition(borrowPositionId);
        return borrowAMM.init(borrowPosition);
      }),
    );
  };

  findAMM = (ammId: string): AMM | undefined => {
    return this.amms.find((item) => item.id.toLowerCase() === ammId.toLowerCase());
  };

  findPosition = (positionId: string): Position | undefined => {
    return this.positions.find((item) => item.id.toLowerCase() === positionId.toLowerCase());
  };

  findBorrowAMM = (borrowAMMId: string): BorrowAMM | undefined => {
    return this.borrowAmms.find((item) => item.id.toLowerCase() === borrowAMMId.toLowerCase());
  };
}

const whitelistedAMMs = [
  'stETH_v1',
  'rETH_v1',
  'borrow_aUSDC_v1',
  'borrow_aETH_v1',
  'borrow_cUSDT_v1',
  'aDAI_v3',
  'borrow_aETH_v2',
  'aETH_v1',
  'aUSDC_v3',
  'cDAI_v3',
].map((item) => mainnetPools[item as keyof typeof mainnetPools].vamm.toLowerCase());

const protocol = new Protocol({
  factoryAddress: '0x6a7a5c3824508D03F0d2d24E0482Bea39E08CcAF',
  provider: new providers.JsonRpcProvider('http://localhost:8545'),
  lpWhitelistedAmms: whitelistedAMMs,
  traderWhitelistedAmms: whitelistedAMMs,
});

protocol.onLand().then(() => {
  console.log('AMMs Done.', protocol.amms.length);
  protocol.onConnect('0xF8F6B70a36f4398f0853a311dC6699Aba8333Cc1').then(() => {
    console.log('Positions Done.', protocol.positions.length);
    console.log('Borrow AMMs Done.', protocol.borrowAmms.length);
  });
});
