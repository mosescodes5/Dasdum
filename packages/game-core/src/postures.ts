export const POSTURES = ['stand', 'sit', 'sit_tv', 'nap', 'type', 'sleep', 'cook', 'eat', 'shower'] as const;
export type PostureName = (typeof POSTURES)[number];
