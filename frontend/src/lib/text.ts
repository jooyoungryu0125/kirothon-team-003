/** 앞 max자까지만 남긴다. max 이하이면 그대로 돌려준다. */
export function clampText(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}
