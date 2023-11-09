function getNGrams(str: string, length: number) {
  str = ' '.repeat(length - 1) + str.toLowerCase() + ' '.repeat(length - 1);
  let nGramVector = new Array(str.length - length + 1);
  for (let i = 0; i < nGramVector.length; i++) {
    nGramVector[i] = str.slice(i, i + length);
  }
  return nGramVector;
}

export function stringSimilarity(str1: string, str2: string, gramSize: number = 2) {
  if (!str1?.length || !str2?.length) { return 0.0; }

  let s1 = str1.length < str2.length ? str1 : str2;
  let s2 = str1.length < str2.length ? str2 : str1;

  let pairs1 = getNGrams(s1, gramSize);
  let pairs2 = getNGrams(s2, gramSize);
  let set = new Set<string>(pairs1);

  let total = pairs2.length;
  let hits = 0;
  for (let item of pairs2) {
    if (set.delete(item)) {
      hits++;
    }
  }
  return hits / total;
}

export function fuzzySearch<T = any>(searchTerm: string, items: T[], options: Partial<FuzzySearchOptions<T>> = {}) {
  const resolvedOptions: FuzzySearchOptions<T> = { ...defaultOptions, ...options };

  const take = resolvedOptions.take > items.length ? items.length : resolvedOptions.take;

  return items.map((item) => {
    return {
      item: item,
      score: stringSimilarity(searchTerm, item[resolvedOptions.key] as any, resolvedOptions.gramSize)
    };
  }).sort((a, b) => b.score - a.score).filter((item) => item.score >= resolvedOptions.threshold).slice(0, take);
}

const defaultOptions: FuzzySearchOptions<object> = {
  key: 'name' as keyof object,
  gramSize: 2,
  threshold: 0.01,
  take: 10
};

export interface FuzzySearchOptions<T = any> {
  key: keyof T;
  gramSize: number;
  threshold: number;
  take: number;
}