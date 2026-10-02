const weightedSum = (digits) =>
  3 * (digits[0] + digits[3] + digits[6]) +
  7 * (digits[1] + digits[4] + digits[7]) +
  (digits[2] + digits[5] + (digits[8] ?? 0));

export function isValidRouting(routing) {
  if (!/^\d{9}$/.test(routing)) return false;
  return weightedSum([...routing].map(Number)) % 10 === 0;
}

export function checkDigit(rdfi) {
  return (10 - (weightedSum([...rdfi].map(Number)) % 10)) % 10;
}
