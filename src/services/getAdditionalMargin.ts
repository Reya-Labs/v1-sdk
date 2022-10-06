const BUFFER = 1.01;

export const getAdditionalMargin = ({
  requiredMargin,
  currentMargin,
  fee,
}: {
  requiredMargin: number;
  currentMargin: number;
  fee: number;
}): number => {
  const total = (requiredMargin + fee) * BUFFER;

  if (currentMargin >= total) {
    return 0;
  }

  return total - currentMargin;
};
