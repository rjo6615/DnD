const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export default function toRoman(n) {
  return ROMANS[n - 1] || '';
}
