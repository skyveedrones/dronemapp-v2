/**
 * LazyMapWrapper — Defers map rendering until the container is visible in the viewport.
 * Uses IntersectionObserver to detect when the map placeholder scrolls into view,
 * then renders the actual map component. This avoids loading mapbox-gl tiles
 * and initializing WebGL context until the user actually needs the map.
 */
import { useRef, useState, useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Map } from "lucide-react";

interface LazyMapWrapperProps {
  children: ReactNode;
  /** Height of the placeholder before the map loads */
  height?: string;
  /** How far before the element enters the viewport to start loading (px) */
  rootMargin?: string;
}

export function LazyMapWrapper({
  children,
  height = "500px",
  rootMargin = "200px",
}: LazyMapWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={containerRef} style={{ minHeight: height }}>
      {isVisible ? (
        children
      ) : (
        <div
          className="relative rounded-lg overflow-hidden border border-border"
          style={{ height }}
        >
          <Skeleton className="w-full h-full" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Map className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground/70">
              Map loading...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
