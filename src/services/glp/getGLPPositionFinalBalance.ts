import * as path from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse';

export type GetPositionFinalBalanceArgs = {
  ownerAddress: string;
  tickLower: number;
  tickUpper: number;
};

export type FinalBalancesCSVRow = {
  ownerAddress: string;
  tickLower: number;
  tickUpper: number;
  finalBalance: number;
};

export const getGLPPositionFinalBalance = async ({
  ownerAddress,
  tickLower,
  tickUpper,
}: GetPositionFinalBalanceArgs): Promise<number> => {
  const csvFilePath = path.resolve(__dirname, 'glp_jun_28_2023_final_balances.csv');
  const headers = ['ownerAddress', 'tickLower', 'tickUpper', 'finalBalance'];
  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
  let positionFinalBalance = 0;

  parse(
    fileContent,
    {
      delimiter: ',',
      columns: headers,
    },
    (error: any, result: FinalBalancesCSVRow[]) => {
      if (error) {
        console.error(error);
      }
      const positionRow: FinalBalancesCSVRow | undefined = result.find(
        (row: FinalBalancesCSVRow): boolean => {
          return (
            row.ownerAddress === ownerAddress &&
            row.tickLower === tickLower &&
            row.tickUpper === tickUpper
          );
        },
      );

      if (!positionRow) {
        throw new Error(
          `No GLP 28th June position found for ownerAddress: ${ownerAddress}, tickLower: ${tickLower}, tickUpper: ${tickUpper}`,
        );
      }

      positionFinalBalance = positionRow.finalBalance;
    },
  );

  return positionFinalBalance;
};
