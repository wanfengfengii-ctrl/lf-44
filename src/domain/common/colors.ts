const CARGO_COLORS = [
  '#4A90D9',
  '#E67E22',
  '#27AE60',
  '#8E44AD',
  '#C0392B',
  '#16A085',
  '#D35400',
  '#2980B9',
  '#F39C12',
  '#7F8C8D'
]

export function getCargoColor(index: number): string {
  return CARGO_COLORS[index % CARGO_COLORS.length]
}
