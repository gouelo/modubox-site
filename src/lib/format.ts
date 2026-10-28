const ils = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

export function formatILS(n: number): string {
  return `${ils.format(n)} ₪`;
}

export function formatCm(n: number): string {
  return `${ils.format(n)} ס"מ`;
}
