export abstract class Margin {

    /**
    * Cannot be constructed.
    */
    private constructor() {}

    public static getMinimumMarginRequirement(recipient: string, tickLower: number, tickUpper: number, amount: number): number {
        // TODO: implement
        return 0;
    }

}
