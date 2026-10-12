"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Maximize2, Plus, Minus, X } from "lucide-react";
import {
  KENYA_COUNTY_SHAPES,
  KENYA_MAP_VIEW,
  KENYA_SHAPE_TO_CANONICAL,
} from "@/data/kenyaCountyShapes";
import type { CountyJobCount } from "@/lib/jobsByCounty";
import { Button } from "@/components/ui/button";

const VB_W = KENYA_MAP_VIEW.width;
const VB_H = KENYA_MAP_VIEW.height;
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const EDGE_MARGIN = 56;

type Viewport = { scale: number; x: number; y: number };

const DEFAULT_VIEWPORT: Viewport = { scale: MIN_SCALE, x: 0, y: 0 };

type Marker = {
  name: string;
  x: number;
  y: number;
  size: number;
  count: number;
  r: number;
};

type Rect = { x0: number; y0: number; x1: number; y1: number };

const intersects = (a: Rect, b: Rect) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function clampViewport(v: Viewport, w: number, h: number): Viewport {
  let { scale, x, y } = v;
  scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  if (scale <= MIN_SCALE + 0.001) return DEFAULT_VIEWPORT;

  const minX = -(scale * VB_W - EDGE_MARGIN);
  const maxX = w - EDGE_MARGIN;
  const minY = -(scale * VB_H - EDGE_MARGIN);
  const maxY = h - EDGE_MARGIN;
  x = Math.max(minX, Math.min(maxX, x));
  y = Math.max(minY, Math.min(maxY, y));
  return { scale, x, y };
}

function zoomAt(v: Viewport, px: number, py: number, factor: number): Viewport {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
  if (Math.abs(scale - v.scale) < 0.0001) return v;
  const ns = scale / v.scale;
  return {
    scale,
    x: v.x + (px - v.x) * (1 - ns),
    y: v.y + (py - v.y) * (1 - ns),
  };
}

function markerRadius(count: number): number {
  if (count <= 0) return 0;
  return 6 + Math.min(12, Math.log2(count + 1) * 1.5);
}

function pillWidth(count: number): number {
  return count.toLocaleString().length * 8.2 + 18;
}

/**
 * Deterministic marker position nudges (viewBox units) for counties whose
 * centroid marker would collide with a neighbouring county's marker at
 * default zoom. Kiambu is shifted north-west off Nairobi's marker.
 */
const MARKER_NUDGE: Record<string, [number, number]> = {
  Kiambu: [-9, -20],
};

/**
 * Decide where each marker's count pill can go. Pills sit to the right of the
 * marker by default; if that would collide with another county's marker circle
 * or an already-placed pill, the pill flips to the left, and if both sides are
 * taken the count moves inside the circle instead. Placing higher-count
 * counties first keeps the biggest numbers front and centre.
 */
function computePillPlacement(
  markers: Marker[]
): Map<string, { flip: boolean; showPill: boolean }> {
  const circleRects = markers.map((m) => ({
    x0: m.x - m.r,
    y0: m.y - m.r,
    x1: m.x + m.r,
    y1: m.y + m.r,
  }));
  const placedPills: Rect[] = [];
  const result = new Map<string, { flip: boolean; showPill: boolean }>();
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const pW = pillWidth(m.count);
    const right: Rect = {
      x0: m.x + m.r,
      y0: m.y - 11,
      x1: m.x + m.r + 8 + pW,
      y1: m.y + 11,
    };
    const left: Rect = {
      x0: m.x - m.r - 8 - pW,
      y0: m.y - 11,
      x1: m.x - m.r,
      y1: m.y + 11,
    };
    const collides = (r: Rect) =>
      circleRects.some((o, j) => j !== i && intersects(r, o)) ||
      placedPills.some((p) => intersects(r, p));
    if (!collides(right)) {
      result.set(m.name, { flip: false, showPill: true });
      placedPills.push(right);
    } else if (!collides(left)) {
      result.set(m.name, { flip: true, showPill: true });
      placedPills.push(left);
    } else {
      result.set(m.name, { flip: false, showPill: false });
    }
  }
  return result;
}

type LabelRect = Rect;

/**
 * Pick which county labels fit without overlapping, resolving higher-count
 * counties first. At default zoom only the largest hubs/counties show labels;
 * zooming in shrinks labels relative to the viewBox so more of them appear.
 */
function computeVisibleLabels(markers: Marker[], scale: number): Set<string> {
  const placed: LabelRect[] = [];
  const visible = new Set<string>();
  for (const m of markers) {
    const w = pillWidth(m.count) + 22 + m.name.length * 6.2;
    const h = 34 / scale;
    const flip = m.x + m.r + 8 + w / scale > VB_W - 4;
    const cx = flip ? m.x - m.r - 8 - w / 2 / scale : m.x + m.r + 8 + w / 2 / scale;
    const rect: LabelRect = {
      x0: cx - w / scale / 2 - m.r,
      y0: m.y - m.r - h / 2,
      x1: cx + w / scale / 2 + m.r,
      y1: m.y + m.r + h / 2,
    };
    const collides = placed.some((p) => intersects(rect, p));
    if (!collides) {
      placed.push(rect);
      visible.add(m.name);
    }
  }
  return visible;
}

type JobsMapProps = {
  counts: CountyJobCount[];
};

export function KenyaJobsMap({ counts }: JobsMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const viewportRef = useRef<Viewport>(DEFAULT_VIEWPORT);
  const commitRafRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({
    w: 600,
    h: 740,
  });
  const [isCoarse, setIsCoarse] = useState(false);

  // Interaction refs
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const lastPinchRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef(0);
  const tapPosRef = useRef<{ x: number; y: number } | null>(null);

  const countByCanonical = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of counts) map.set(c.name, c.count);
    return map;
  }, [counts]);

  const countyByShape = useMemo(() => {
    return KENYA_COUNTY_SHAPES.map((shape) => {
      const canonical = KENYA_SHAPE_TO_CANONICAL[shape.name] ?? shape.name;
      const count = countByCanonical.get(canonical) ?? 0;
      return { shape, name: canonical, count };
    });
  }, [countByCanonical]);

  const markers = useMemo<Marker[]>(() => {
    return countyByShape
      .filter((c) => c.count > 0)
      .map((c) => {
        const nudge = MARKER_NUDGE[c.name];
        return {
          name: c.name,
          x: c.shape.x + (nudge?.[0] ?? 0),
          y: c.shape.y + (nudge?.[1] ?? 0),
          size: c.shape.size,
          count: c.count,
          r: markerRadius(c.count),
        };
      })
      .sort((a, b) => b.count - a.count || b.size - a.size);
  }, [countyByShape]);

  const pillPlacement = useMemo(() => computePillPlacement(markers), [markers]);

  const visibleLabels = useMemo(
    () => computeVisibleLabels(markers, viewport.scale),
    [markers, viewport.scale]
  );

  const totalActive = useMemo(
    () => markers.reduce((sum, m) => sum + m.count, 0),
    [markers]
  );

  // ---- Imperative viewport transform -------------------------------------
  // Pan/zoom is applied directly to the SVG <g> via requestAnimationFrame so
  // dragging never re-renders React per pointer event — keeps panning smooth
  // on low-end phones and laptops. State is synced afterwards for the
  // zoom-dependent label layout, tooltips and popups.
  const applyTransform = useCallback((v: Viewport) => {
    groupRef.current?.setAttribute(
      "transform",
      `translate(${v.x} ${v.y}) scale(${v.scale})`
    );
  }, []);

  const scheduleCommit = useCallback(() => {
    if (commitRafRef.current !== null) return;
    commitRafRef.current = requestAnimationFrame(() => {
      commitRafRef.current = null;
      setViewport(viewportRef.current);
    });
  }, []);

  const setView = useCallback(
    (v: Viewport) => {
      viewportRef.current = v;
      applyTransform(v);
      scheduleCommit();
    },
    [applyTransform, scheduleCommit]
  );

  useEffect(() => {
    applyTransform(viewportRef.current);
  }, [applyTransform]);

  useEffect(
    () => () => {
      if (commitRafRef.current !== null) cancelAnimationFrame(commitRafRef.current);
    },
    []
  );

  // Container size + device-type detection
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () =>
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setIsCoarse(window.matchMedia?.("(pointer: coarse)").matches ?? false);
  }, []);

  // Clamp viewport when the container resizes
  useEffect(() => {
    setView(clampViewport(viewportRef.current, containerSize.w, containerSize.h));
  }, [containerSize, setView]);

  // Native wheel listener so we can preventDefault (React wheels are passive)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0016);
      setView(
        clampViewport(zoomAt(viewportRef.current, px, py, factor), rect.width, rect.height)
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView]);

  const resetView = useCallback(() => {
    setView(DEFAULT_VIEWPORT);
    setHovered(null);
  }, [setView]);

  const zoomStep = useCallback(
    (direction: 1 | -1) => {
      const el = wrapperRef.current;
      const rect = el?.getBoundingClientRect();
      const px = rect ? rect.width / 2 : 0;
      const py = rect ? rect.height / 2 : 0;
      setView(
        clampViewport(
          zoomAt(viewportRef.current, px, py, direction > 0 ? 1.6 : 1 / 1.6),
          rect?.width ?? 600,
          rect?.height ?? 740
        )
      );
    },
    [setView]
  );

  const markerFor = useCallback(
    (name: string) => markers.find((m) => m.name === name),
    [markers]
  );

  const selectCounty = useCallback((name: string) => {
    setSelected(name);
    setHovered(name);
  }, []);

  // ---- Pointer handlers (drag + pinch + tap) ----
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const el = wrapperRef.current;
    if (el) el.setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      if (viewportRef.current.scale > MIN_SCALE + 0.001) {
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          origX: viewportRef.current.x,
          origY: viewportRef.current.y,
          moved: false,
        };
      }
    } else if (pointersRef.current.size === 2) {
      dragRef.current = null;
      const [a, b] = [...pointersRef.current.values()];
      lastPinchRef.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const current = pointersRef.current.get(e.pointerId);
      if (!current) return;
      current.x = e.clientX;
      current.y = e.clientY;

      const el = wrapperRef.current;
      const rect = el?.getBoundingClientRect();

      if (pointersRef.current.size === 1 && dragRef.current) {
        const drag = dragRef.current;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) {
          drag.moved = true;
          suppressClickRef.current = true;
        }
        if (drag.moved) {
          // Update the transform directly — no React re-render while panning.
          const v = clampViewport(
            { ...viewportRef.current, x: drag.origX + dx, y: drag.origY + dy },
            rect?.width ?? 600,
            rect?.height ?? 740
          );
          viewportRef.current = v;
          applyTransform(v);
        }
        return;
      }

      if (pointersRef.current.size === 2 && lastPinchRef.current !== null) {
        const [a, b] = [...pointersRef.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const px = midX - (rect?.left ?? 0);
        const py = midY - (rect?.top ?? 0);
        const factor = dist / lastPinchRef.current;
        setView(
          clampViewport(zoomAt(viewportRef.current, px, py, factor), rect?.width ?? 600, rect?.height ?? 740)
        );
        lastPinchRef.current = dist;
      }
    },
    [applyTransform, setView]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const wasPinching = pointersRef.current.size === 2;
      pointersRef.current.delete(e.pointerId);
      dragRef.current = null;
      lastPinchRef.current = null;

      // Commit the panned position so zoom-dependent UI stays in sync.
      setViewport(viewportRef.current);

      if (!wasPinching && pointersRef.current.size === 0) {
        // Double-tap to zoom (mobile/desktop)
        const now = Date.now();
        const moved = suppressClickRef.current;
        suppressClickRef.current = false;
        if (!moved && tapPosRef.current && now - lastTapRef.current < 350) {
          const dx = e.clientX - tapPosRef.current.x;
          const dy = e.clientY - tapPosRef.current.y;
          if (Math.hypot(dx, dy) < 24) {
            const el = wrapperRef.current;
            const rect = el?.getBoundingClientRect();
            setView(
              clampViewport(
                zoomAt(viewportRef.current, e.clientX - (rect?.left ?? 0), e.clientY - (rect?.top ?? 0), 1.7),
                rect?.width ?? 600,
                rect?.height ?? 740
              )
            );
            lastTapRef.current = 0;
            tapPosRef.current = null;
            return;
          }
        }
        lastTapRef.current = now;
        tapPosRef.current = { x: e.clientX, y: e.clientY };
      }
    },
    [setView]
  );

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    dragRef.current = null;
    lastPinchRef.current = null;
  }, []);

  // ---- County path handlers ----
  const countyClass = (name: string, count: number) => {
    const cls = [
      "kenya-county-shape",
      count > 0 ? "kenya-county-active" : "",
      selected === name ? "kenya-county-selected" : hovered === name ? "kenya-county-hover" : "",
    ].filter(Boolean).join(" ");
    return cls;
  };

  const handleCountyClick = useCallback(
    (e: React.MouseEvent, name: string) => {
      e.stopPropagation();
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      selectCounty(name);
    },
    [selectCounty]
  );

  // ---- Screen-space helpers for tooltip/popup ----
  const screenPos = (name: string) => {
    const marker = markerFor(name);
    if (marker) {
      return { x: viewport.x + marker.x * viewport.scale, y: viewport.y + marker.y * viewport.scale };
    }
    const entry = countyByShape.find((c) => c.name === name);
    if (!entry) return null;
    return {
      x: viewport.x + entry.shape.x * viewport.scale,
      y: viewport.y + entry.shape.y * viewport.scale,
    };
  };

  const hoveredInfo = hovered ? countyByShape.find((c) => c.name === hovered) : null;
  const selectedInfo = selected ? countyByShape.find((c) => c.name === selected) : null;
  const hoveredPos = hovered ? screenPos(hovered) : null;
  const selectedPos = selected ? screenPos(selected) : null;

  const escapeHandler = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setSelected(null);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", escapeHandler);
    return () => window.removeEventListener("keydown", escapeHandler);
  }, [escapeHandler]);

  const tooltipStyle =
    hoveredPos && !isCoarse
      ? {
          left: Math.min(Math.max(hoveredPos.x, 70), containerSize.w - 70),
          top: Math.max(hoveredPos.y - 52, 8),
        }
      : null;

  const popupStyle = (() => {
    if (!selectedPos) return null;
    if (isCoarse) {
      return { left: 0, right: 0, bottom: 12 };
    }
    const width = 232;
    const top = selectedPos.y > 140 ? selectedPos.y - 12 : selectedPos.y + 20;
    const left = Math.min(Math.max(selectedPos.x, width / 2 + 8), containerSize.w - width / 2 - 8);
    return { left, top, transform: "translate(-50%, -100%)" as const };
  })();

  const selectedMarker = selected ? markerFor(selected) : null;

  return (
    <div
      ref={wrapperRef}
      className="relative w-full touch-pan-y overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950"
      style={{ touchAction: viewport.scale > MIN_SCALE + 0.001 ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={(e) => {
        e.preventDefault();
        const rect = wrapperRef.current?.getBoundingClientRect();
        setView(
          clampViewport(
            zoomAt(viewportRef.current, e.clientX - (rect?.left ?? 0), e.clientY - (rect?.top ?? 0), 1.7),
            rect?.width ?? 600,
            rect?.height ?? 740
          )
        );
      }}
      onClick={(e) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        // Any click that reaches the wrapper is a background click (paths and
        // the popup stop propagation), so it clears the selection.
        setSelected(null);
      }}
    >
      <span className="sr-only">
        Interactive map of Kenya with live job counts per county.{" "}
        {totalActive.toLocaleString()} active jobs across {markers.length} counties.
      </span>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={`Map of Kenya showing live job counts. ${totalActive.toLocaleString()} active jobs across ${markers.length} counties.`}
        className="block h-auto w-full select-none"
      >
        {/* County shapes */}
        <g ref={groupRef}>
          {countyByShape.map(({ shape, name, count }) => (
            <g key={shape.id}>
              {shape.paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  className={countyClass(name, count)}
                  tabIndex={0}
                  role="button"
                  aria-label={
                    count > 0
                      ? `${name}, ${count} active jobs`
                      : `${name}, no live jobs`
                  }
                  aria-pressed={selected === name}
                  onClick={(e) => handleCountyClick(e, name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectCounty(name);
                    }
                  }}
                  onPointerEnter={() => {
                    if (!isCoarse) setHovered(name);
                  }}
                  onPointerLeave={() => {
                    if (!isCoarse) setHovered((h) => (h === name ? null : h));
                  }}
                  onFocus={() => setHovered(name)}
                  onBlur={() => setHovered((h) => (h === name ? null : h))}
                />
              ))}
            </g>
          ))}

          {/* Live markers */}
          {markers.map((m) => {
            const showLabel = visibleLabels.has(m.name);
            const pW = pillWidth(m.count);
            const pill = pillPlacement.get(m.name) ?? { flip: false, showPill: true };
            const countText = m.count.toLocaleString();
            const insideFontSize = pill.showPill
              ? 0
              : Math.min(12.5, Math.max(8, (2 * (m.r - 2)) / (countText.length * 0.66)));
            return (
              <g
                key={`marker-${m.name}`}
                transform={`translate(${m.x} ${m.y})`}
                pointerEvents="none"
              >
                <circle
                  className="kenya-marker-ring"
                  r={m.r}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth={2}
                />
                <circle
                  r={m.r}
                  fill="#16a34a"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
                {pill.showPill ? (
                  <g transform={`translate(${pill.flip ? -(m.r + 8) : m.r + 8} 0)`}>
                    <rect
                      x={pill.flip ? -pW : 0}
                      y={-11}
                      width={pW}
                      height={22}
                      rx={11}
                      className="kenya-marker-pill"
                    />
                    <text
                      x={pill.flip ? -pW / 2 : pW / 2}
                      y={4}
                      textAnchor="middle"
                      className="kenya-marker-count"
                    >
                      {countText}
                    </text>
                  </g>
                ) : (
                  <text
                    y={insideFontSize * 0.35}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={insideFontSize}
                    fontWeight={700}
                  >
                    {countText}
                  </text>
                )}
                {showLabel && (
                  <text
                    x={0}
                    y={m.r + 26}
                    textAnchor="middle"
                    className="kenya-marker-label"
                  >
                    {m.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Controls */}
      <div
        className="absolute right-3 top-3 flex flex-col gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-8 w-8 rounded-full shadow-md"
          aria-label="Zoom in"
          onClick={() => zoomStep(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-8 w-8 rounded-full shadow-md"
          aria-label="Zoom out"
          onClick={() => zoomStep(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full bg-card/90 shadow-md"
          aria-label="Reset map view to show all of Kenya"
          onClick={resetView}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Hover tooltip */}
      {tooltipStyle && hoveredInfo && (
        <div
          className="kenya-map-popover pointer-events-none -translate-x-1/2 rounded-lg bg-card/95 px-3 py-1.5 text-sm shadow-lg backdrop-blur"
          style={tooltipStyle}
          role="status"
        >
          <div className="font-semibold">{hoveredInfo.name}</div>
          <div className="text-muted-foreground">
            {hoveredInfo.count > 0
              ? `${hoveredInfo.count.toLocaleString()} active jobs`
              : "No live jobs"}
          </div>
        </div>
      )}

      {/* County popup */}
      {selectedInfo && popupStyle && (
        <div
          className="kenya-map-popover mx-auto w-56 rounded-xl border border-border bg-card p-3 shadow-xl"
          style={popupStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(null);
            }}
            className="absolute right-1.5 top-1.5 rounded-full p-1 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            aria-label={`Close ${selectedInfo.name} details`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="pr-5">
            <div className="font-bold text-foreground">{selectedInfo.name}</div>
            <div className="text-sm text-muted-foreground">
              {selectedInfo.count.toLocaleString()} active jobs
            </div>
          </div>
          <Link
            href={`/jobs?location=${encodeURIComponent(selectedInfo.name)}`}
            className="mt-2 flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View {selectedInfo.name} Jobs
            <span aria-hidden="true">→</span>
          </Link>
          <span className="sr-only">
            {selectedMarker
              ? `${selectedInfo.name} has ${selectedInfo.count} active jobs.`
              : `${selectedInfo.name} has no live jobs.`}
          </span>
        </div>
      )}
    </div>
  );
}
