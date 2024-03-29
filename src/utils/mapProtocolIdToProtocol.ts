const mapProtocolIdToProtocol = (protocolId: number): string => {
  if (protocolId === 1) {
    return 'AAVE V2';
  }

  if (protocolId === 2) {
    return 'COMPOUND';
  }

  if (protocolId === 3) {
    return 'LIDO';
  }

  if (protocolId === 4) {
    return 'ROCKET';
  }

  if (protocolId === 5) {
    return 'BORROW AAVE';
  }

  if (protocolId === 6) {
    return 'BORROW COMPOUND';
  }

  if (protocolId === 7) {
    return 'AAVE V3';
  }

  if (protocolId === 8) {
    return 'GLP';
  }

  if (protocolId === 9) {
    return 'BORROW AAVE V3';
  }

  if (protocolId === 10) {
    return 'SOFR';
  }

  throw new Error('Unrecognized protocol');
};

export default mapProtocolIdToProtocol;
