type StatObject = {
  memory: {
    used: string,
    usedPercentage: string,
    usedPercentageRaw: number;
  },
  cpu: {
    used: number,
    usedPercentage: string;
  };
};


type ThreadStatObject = {
  0?: StatObject;
  [key: number]: StatObject;
};
