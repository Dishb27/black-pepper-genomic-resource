export const processSNPData = (textContent, binSize = 1_000_000) => {
  const lines = textContent.split("\n");
  const bins = {};

  lines.forEach((line) => {
    if (!line.trim()) return; // Skip empty lines
    const match = line.match(/CHROM: (\S+), POS: (\d+),/);
    if (!match) return;

    const chromosome = match[1];
    const position = parseInt(match[2], 10);

    if (!bins[chromosome]) bins[chromosome] = {};

    const bin = Math.floor(position / binSize);
    bins[chromosome][bin] = (bins[chromosome][bin] || 0) + 1;
  });

  // Custom sort for chromosome names
  const chromosomeSort = (a, b) => {
    const extractNumber = (chr) => parseInt(chr.replace(/[^\d]/g, ""), 10) || 0; // Extract numeric part
    const extractString = (chr) => chr.replace(/\d/g, ""); // Extract string part

    const numA = extractNumber(a);
    const numB = extractNumber(b);
    if (numA !== numB) return numA - numB; // Sort by numeric part
    return extractString(a).localeCompare(extractString(b)); // Sort by string part
  };

  const chromosomes = Object.keys(bins).sort(chromosomeSort); // Sort chromosomes
  const heatmapData = chromosomes.map((chr) => {
    const maxBin = Math.max(...Object.keys(bins[chr]).map(Number));
    const counts = Array.from(
      { length: maxBin + 1 },
      (_, i) => bins[chr][i] || 0
    );
    return counts;
  });

  return { chromosomes, heatmapData };
};
