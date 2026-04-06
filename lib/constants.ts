export const WORK_TYPES = ['일반용역', '기타', '민간', '기술용역'] as const;
export type WorkType = typeof WORK_TYPES[number];
