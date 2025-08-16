export const money = (n: number) => Math.round(n * 100) / 100;
export const fmtMoney = (n: number) =>
  `$${(Math.round(n * 100) / 100).toLocaleString(undefined,{ minimumFractionDigits:2 })}`;
export const fmtNum = (n: number, digits = 0) =>
  Number.isFinite(n) ? n.toLocaleString(undefined,{ maximumFractionDigits: digits }) : String(n);

// crude number grabbers (good enough for MVP)
export function firstTwoNumbers(text: string) {
  return (text.match(/(\d[\d,\.]*)/g) || []).map(s => parseFloat(s.replace(/,/g,""))).slice(0,2);
}
export function firstNumber(text: string) {
  const nums = (text.match(/(\d[\d,\.]*)/g) || []).map(s => parseFloat(s.replace(/,/g,"")));
  return nums[0];
}
