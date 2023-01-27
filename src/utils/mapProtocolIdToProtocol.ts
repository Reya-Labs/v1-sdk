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

  throw new Error('Unrecognized protocol');
};

export default mapProtocolIdToProtocol;
