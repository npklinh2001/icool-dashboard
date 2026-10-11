import type { ReportStatus } from './types';

export const STATUS_LABELS: Record<ReportStatus, string> = {
  live: 'Đang hoạt động',
  building: 'Đang xây dựng',
  proposed: 'Đã đề xuất',
  noplan: 'Chưa có kế hoạch',
};

export const DEFAULT_STATUS: ReportStatus = 'proposed';
export const DEFAULT_NODE_COLOR = '#6b6e78';

export const COLUMN_WIDTHS = [250, 340, 320, 320, 320];
export const COLUMN_GAP = 110;
export const ROW_GAP = 14;
export const KHOI_GAP = 26;
export const CANVAS_PADDING = 60;

export const NODE_HEIGHT = { root: 76, khoi: 64, group: 54, leaf: 60 } as const;

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.5;
export const FIT_MIN_ZOOM = 0.35;
export const FIT_MAX_ZOOM = 1.05;
export const ZOOM_BUTTON_FACTOR = 1.2;
export const WHEEL_ZOOM_SENSITIVITY = 0.0015;
export const FIT_BOTTOM_RESERVE = 60;
export const DRAG_THRESHOLD_PX = 2;

export const THEME_STORAGE_KEY = 'icool-theme';
