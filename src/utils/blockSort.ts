export function sortBlocksByName<T extends { block_name: string }>(blocks: T[]) {
  return [...blocks].sort((a, b) => {
    const numA = parseInt(a.block_name.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.block_name.replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.block_name.localeCompare(b.block_name);
  });
}

export function formatRobotTileLabel(robotNo: string) {
  return robotNo.replace(/^AAG-/, '');
}

export function formatRobotTileCompact(robotNo: string) {
  const stripped = formatRobotTileLabel(robotNo);
  const digits = stripped.replace(/\D/g, '');
  if (digits.length >= 3) return digits.slice(-3);
  return stripped.length > 5 ? stripped.slice(-5) : stripped;
}
