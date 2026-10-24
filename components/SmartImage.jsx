"use client";

import { useEffect, useRef, useState } from "react";

function resolveImageSource(source, imageKitTransform = "f-auto,q-80") {
  if (!source) return "";

  const mappedSource = source;

  if (mappedSource.includes("ik.imagekit.io/") && !mappedSource.includes("tr=") && imageKitTransform) {
    const separator = mappedSource.includes("?") ? "&" : "?";
    return `${mappedSource}${separator}tr=${imageKitTransform}`;
  }

  return mappedSource;
}

export default function SmartImage({
  src,
  alt = "",
  className = "",
  imgClassName = "h-full w-full object-cover",
  tone = "from-stone-700 to-stone-900",
  fallback = null,
  loading = "lazy",
  fetchPriority = "auto",
  imageKitTransform,
  style,
  children,
}) {
  const resolvedSrc = resolveImageSource(src, imageKitTransform);
  const [failedSource, setFailedSource] = useState("");
  const [loadedSource, setLoadedSource] = useState("");
  const imgRef = useRef(null);
  const failed = failedSource === resolvedSrc;
  const isLoading = Boolean(resolvedSrc) && loadedSource !== resolvedSrc && !failed;

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    if (el.complete) {
      if (el.naturalWidth === 0) {
        setFailedSource(resolvedSrc);
      } else {
        setLoadedSource(resolvedSrc);
      }
    }
  }, [resolvedSrc]);

  const position = /\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative";

  return (
    <div style={style} className={`${position} overflow-hidden bg-gradient-to-br ${tone} ${className}`}>
      {resolvedSrc && !failed ? (
        <>
          <img
            ref={imgRef}
            src={resolvedSrc}
            alt={alt}
            loading={loading}
            decoding="async"
            fetchPriority={fetchPriority}
            className={`${imgClassName} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
            onLoad={() => setLoadedSource(resolvedSrc)}
            onError={() => setFailedSource(resolvedSrc)}
          />
          {isLoading && <div className={`absolute inset-0 animate-pulse bg-gradient-to-br ${tone}`} />}
        </>
      ) : (
        fallback
      )}
      {children}
    </div>
  );
}
