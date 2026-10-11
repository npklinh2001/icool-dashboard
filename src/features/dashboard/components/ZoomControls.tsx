import { StrokeIcon } from './Icons';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFit: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onResetZoom, onFit }: ZoomControlsProps) {
  return (
    <div className="zoom">
      <button title="Thu nhỏ" onClick={onZoomOut}>
        <StrokeIcon>
          <path d="M5 12h14" />
        </StrokeIcon>
      </button>
      <button className="pct" title="Về 100%" onClick={onResetZoom}>
        {Math.round(zoom * 100)}%
      </button>
      <button title="Phóng to" onClick={onZoomIn}>
        <StrokeIcon>
          <path d="M12 5v14M5 12h14" />
        </StrokeIcon>
      </button>
      <button title="Vừa màn hình" onClick={onFit}>
        <StrokeIcon>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </StrokeIcon>
      </button>
    </div>
  );
}
