"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SmartImage from "./SmartImage";

export default function ProductGallery({ product }) {
  const images = useMemo(
    () => [...new Set([product.src, ...(product.galleryUrls || [])].filter(Boolean))],
    [product.galleryUrls, product.src],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const touchStartX = useRef(null);
  const selectedImage = images[selectedIndex] || "";

  useEffect(() => {
    setSelectedIndex(0);
    setZoomed(false);
  }, [images]);

  function selectImage(index) {
    setSelectedIndex(index);
    setZoomed(false);
  }

  function showPreviousImage() {
    selectImage((selectedIndex - 1 + images.length) % images.length);
  }

  function showNextImage() {
    selectImage((selectedIndex + 1) % images.length);
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 40 || images.length < 2) return;
    if (endX < startX) showNextImage();
    else showPreviousImage();
  }

  function toggleZoom() {
    if (window.matchMedia("(min-width: 640px)").matches) setZoomed((value) => !value);
  }

  function updateZoomPosition(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setZoomPosition({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  }

  return (
    <div className="grid items-start gap-4 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5">
      <div className="order-2 flex max-w-full gap-3 overflow-x-auto pb-1 sm:max-h-[760px] sm:flex-col sm:overflow-y-auto sm:pr-2">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => selectImage(index)}
            aria-label={`View product image ${index + 1}`}
            aria-pressed={selectedImage === image}
            className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition duration-300 sm:h-24 sm:w-24 ${selectedImage === image ? "border-gold shadow-[0_8px_22px_-10px_rgba(201,154,75,0.9)]" : "border-transparent hover:border-gold/50"}`}
          >
            <SmartImage src={image} alt="" tone={product.tone} className="h-full w-full" imgClassName="h-full w-full object-contain" />
          </button>
        ))}
      </div>

      <div
        className={`order-1 relative rounded-[24px] sm:order-2 ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={updateZoomPosition}
        onClick={toggleZoom}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-gold/20 bg-white shadow-[0_28px_70px_-35px_rgba(21,16,12,0.55)] sm:aspect-square">
          <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${selectedIndex * 100}%)` }}>
            {images.map((image, index) => (
              <SmartImage
                key={image}
                src={image}
                alt={index === selectedIndex ? product.name : ""}
                tone={product.tone}
                className="h-full w-full shrink-0"
                style={{ "--zoom-x": `${zoomPosition.x}%`, "--zoom-y": `${zoomPosition.y}%` }}
                imgClassName={`h-full w-full object-contain transition-transform duration-300 [transform-origin:var(--zoom-x)_var(--zoom-y)] ${index === selectedIndex && zoomed ? "scale-[1.8]" : "scale-100"}`}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
              />
            ))}
          </div>
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink/85 px-3 py-2 shadow-[0_8px_20px_-8px_rgba(21,16,12,0.8)] ring-1 ring-gold/50 backdrop-blur-sm" aria-label={`Product image ${selectedIndex + 1} of ${images.length}`}>
            {images.map((image, index) => <span key={image} className={`h-2 w-2 rounded-full transition-colors ${index === selectedIndex ? "bg-gradient-to-b from-gold-light to-gold" : "bg-gold/45"}`} />)}
          </div>
        )}
      </div>
    </div>
  );
}
