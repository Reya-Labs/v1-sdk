import { providers, Signer } from 'ethers';
import { BorrowAMM } from '../BorrowAMM/borrowAMM';
import { Position } from '../Position/position';
import { AMM } from '../AMM/amm';
import { getGraphAMMs } from '../../../graph-queries/amms';
import { getGraphPositions } from '../../../graph-queries/positions';

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

  public get lpPools(): AMM[] {
    return this.amms.filter((amm) => this.lpWhitelistedAmms.has(amm.id));
  }

  public get traderPools(): AMM[] {
    return this.amms.filter((amm) => this.traderWhitelistedAmms.has(amm.id));
  }

  public get lpPositions(): Position[] {
    return this.positions.filter((position) => position.positionType === 3);
  }

  public get traderPositions(): Position[] {
    return this.positions.filter(
      (position) => position.positionType === 1 || position.positionType === 2,
    );
  }
}
