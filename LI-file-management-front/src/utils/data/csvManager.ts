export const getDataFromCSV = (csv: string, takeHeader: boolean = true, skip: number = 0): { header: string[], rows: string[][]; } => {
  const data = csv.split('\n');
  const separator = getSeparator(csv);
  const header = takeHeader ? data[0].split(separator) : [];
  const rows = data.slice(skip + 1).map(row => row.split(separator));
  return {
    header,
    rows
  };
};


const getSeparator = (csv: string) => {
  const data = csv.split('\n');
  const comma = data[0].split(',').length;
  const semicolon = data[0].split(';').length;
  return comma > semicolon ? ',' : ';';
};