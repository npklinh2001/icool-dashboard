import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  DRAG_THRESHOLD_PX,
  FIT_BOTTOM_RESERVE,
  FIT_MAX_ZOOM,
  FIT_MIN_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  WHEEL_ZOOM_SENSITIVITY,
  ZOOM_BUTTON_FACTOR,
} from '../constants';

export interface ViewState {
  x: number;
  y: number;
  k: number;
}

interface CanvasBounds {
  width: number;
  height: number;
}

interface PanZoomOptions {
  viewportRef: RefObject<HTMLDivElement | null>;
  bounds: CanvasBounds;
  onBackgroundClick: () => void;
}

interface Point {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function zoomView(view: ViewState, px: number, py: number, factor: number): ViewState {
  const k = clamp(view.k * factor, MIN_ZOOM, MAX_ZOOM);
  const ratio = k / view.k;
  return { x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio, k };
}

// Handles wheel zoom, drag pan and two-finger pinch for the canvas viewport
export function usePanZoom({ viewportRef, bounds, onBackgroundClick }: PanZoomOptions) {
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, k: 1 });
  const [animate, setAnimate] = useState(false);
  const [panning, setPanning] = useState(false);

  const boundsRef = useRef(bounds);
  const pointers = useRef(new Map<number, Point>());
  const pinchDistance = useRef<number | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  const update = useCallback((next: (current: ViewState) => ViewState, withAnimation = false) => {
    setAnimate(withAnimation);
    setView(next);
  }, []);

  const zoomAtCenter = useCallback(
    (factor: number) => update((v) => zoomView(v, innerWidth / 2, innerHeight / 2, factor), true),
    [update],
  );

  const fit = useCallback(
    (withAnimation: boolean) => {
      const { width, height } = boundsRef.current;
      const top = document.querySelector('header')?.offsetHeight ?? 0;
      const availableWidth = innerWidth;
      const availableHeight = innerHeight - top - FIT_BOTTOM_RESERVE;
      const k = clamp(
        Math.min(availableWidth / width, availableHeight / height),
        FIT_MIN_ZOOM,
        FIT_MAX_ZOOM,
      );
      update(
        () => ({
          k,
          x: Math.max((availableWidth - width * k) / 2, 0),
          y: top + Math.max(0, (availableHeight - height * k) / 2),
        }),
        withAnimation,
      );
    },
    [update],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    // Non-passive so preventDefault can stop the page from scrolling while zooming
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const isZoomGesture =
        event.ctrlKey || (Math.abs(event.deltaY) > Math.abs(event.deltaX) && !event.shiftKey);
      if (isZoomGesture) {
        const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
        update((v) => zoomView(v, event.clientX, event.clientY, factor));
      } else {
        update((v) => ({ ...v, x: v.x - (event.deltaX || event.deltaY) }));
      }
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [viewportRef, update]);

  const isOnNode = (event: ReactPointerEvent) => (event.target as HTMLElement).closest('.node');

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isOnNode(event)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved.current = false;
    setPanning(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDistance.current = distance(a, b);
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointers.current.get(event.pointerId);
    if (!point) return;

    if (pointers.current.size === 2 && pinchDistance.current !== null) {
      point.x = event.clientX;
      point.y = event.clientY;
      const [a, b] = [...pointers.current.values()];
      const current = distance(a, b);
      const factor = current / pinchDistance.current;
      update((v) => zoomView(v, (a.x + b.x) / 2, (a.y + b.y) / 2, factor));
      pinchDistance.current = current;
      moved.current = true;
      return;
    }

    const dx = event.clientX - point.x;
    const dy = event.clientY - point.y;
    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) moved.current = true;
    point.x = event.clientX;
    point.y = event.clientY;
    update((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
    if (pointers.current.size === 0) setPanning(false);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!moved.current && !isOnNode(event)) onBackgroundClick();
    endPointer(event);
  };

  return {
    view,
    animate,
    panning,
    fit,
    zoomIn: () => zoomAtCenter(ZOOM_BUTTON_FACTOR),
    zoomOut: () => zoomAtCenter(1 / ZOOM_BUTTON_FACTOR),
    resetZoom: () => update((v) => zoomView(v, innerWidth / 2, innerHeight / 2, 1 / v.k), true),
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: endPointer },
  };
}
