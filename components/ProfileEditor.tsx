"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ProfileEditorProps {
  templateUrl: string;
  templateName: string;
  onClose: () => void;
}

export default function ProfileEditor({ templateUrl, templateName, onClose }: ProfileEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userImage, setUserImage] = useState<HTMLImageElement | null>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [templateBlobUrl, setTemplateBlobUrl] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 });
  const [containerWidth, setContainerWidth] = useState(500);

  // Transform state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Status
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Measure container width for responsive canvas
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setContainerWidth(Math.min(500, containerRef.current.clientWidth - 16));
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Load template image as blob to avoid CORS/tainted canvas issues
  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function loadTemplate() {
      try {
        // Fetch as blob to guarantee clean canvas (no CORS taint)
        const res = await fetch(templateUrl);
        if (!res.ok) throw new Error("Failed to load template");
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          setTemplateImage(img);
          setTemplateBlobUrl(blobUrl);
          setCanvasSize({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          if (cancelled) return;
          setError("Failed to load template image");
          URL.revokeObjectURL(blobUrl);
        };
        img.src = blobUrl;
      } catch {
        if (!cancelled) setError("Failed to load template image");
      }
    }

    loadTemplate();
    return () => {
      cancelled = true;
      if (templateBlobUrl) URL.revokeObjectURL(templateBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateUrl]);

  // Auto-fit user image when loaded
  const fitUserImage = useCallback(
    (img: HTMLImageElement) => {
      const cw = canvasSize.width;
      const ch = canvasSize.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      // Scale to cover the canvas
      const scale = Math.max(cw / iw, ch / ih);
      setZoom(scale);
      setPanX(cw / 2);
      setPanY(ch / 2);
      setRotation(0);
    },
    [canvasSize]
  );

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw user image first (behind template)
    if (userImage) {
      ctx.save();
      ctx.translate(panX, panY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.drawImage(
        userImage,
        -userImage.naturalWidth / 2,
        -userImage.naturalHeight / 2
      );
      ctx.restore();
    }

    // Draw template overlay on top
    ctx.drawImage(templateImage, 0, 0, canvasSize.width, canvasSize.height);
  }, [templateImage, userImage, zoom, panX, panY, rotation, canvasSize]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const img = new Image();
    img.onload = () => {
      setUserImage(img);
      fitUserImage(img);
    };
    img.onerror = () => setError("Failed to load image. Try a different file.");
    img.src = URL.createObjectURL(file);
  }

  // Mouse/touch drag handlers
  function getCanvasCoords(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("changedTouches" in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (!userImage) return;
    e.preventDefault();
    setIsDragging(true);
    const coords = getCanvasCoords(e);
    setDragStart({ x: coords.x - panX, y: coords.y - panY });
  }

  function handlePointerMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDragging) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setPanX(coords.x - dragStart.x);
    setPanY(coords.y - dragStart.y);
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((prev) => Math.max(0.1, Math.min(5, prev + delta)));
  }

  function handleDownload() {
    setDownloading(true);
    setError(null);

    try {
      // Render at full resolution on offscreen canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = canvasSize.width;
      offscreen.height = canvasSize.height;
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        setError("Canvas not supported in this browser");
        setDownloading(false);
        return;
      }

      if (userImage) {
        ctx.save();
        ctx.translate(panX, panY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.drawImage(userImage, -userImage.naturalWidth / 2, -userImage.naturalHeight / 2);
        ctx.restore();
      }

      if (templateImage) {
        ctx.drawImage(templateImage, 0, 0, canvasSize.width, canvasSize.height);
      }

      // Try toBlob first, fall back to toDataURL
      try {
        offscreen.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `profile-${templateName.replace(/\s+/g, "-").toLowerCase()}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } else {
              // Fallback to toDataURL
              downloadViaDataUrl(offscreen);
            }
            setDownloading(false);
          },
          "image/png"
        );
      } catch {
        // SecurityError from tainted canvas — use toDataURL fallback
        downloadViaDataUrl(offscreen);
        setDownloading(false);
      }
    } catch (err) {
      console.error("Download error:", err);
      setError("Download failed. Try a different browser.");
      setDownloading(false);
    }
  }

  function downloadViaDataUrl(canvas: HTMLCanvasElement) {
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `profile-${templateName.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setError("Download failed — canvas security error. Try a different browser.");
    }
  }

  function handleReset() {
    if (userImage) {
      fitUserImage(userImage);
    }
  }

  // Responsive display size
  const displaySize = containerWidth;
  const displayHeight = displaySize * (canvasSize.height / canvasSize.width);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 truncate pr-2">{templateName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Canvas Preview */}
            <div className="flex-1 flex flex-col items-center" ref={containerRef}>
              <div
                className="relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48cmVjdCB4PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjNmNGY2Ii8+PHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==')] bg-repeat rounded-xl overflow-hidden shadow-inner w-full"
                style={{ maxWidth: displaySize, height: displayHeight }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    cursor: userImage ? (isDragging ? "grabbing" : "grab") : "default",
                    touchAction: "none",
                  }}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                  onWheel={handleWheel}
                />
              </div>

              {!userImage && (
                <p className="text-sm text-gray-400 mt-2">Upload a photo to get started</p>
              )}
            </div>

            {/* Controls */}
            <div className="lg:w-72 space-y-4">
              {/* Upload */}
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {userImage ? "Change Photo" : "Upload Your Photo"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {userImage && (
                <>
                  {/* Zoom */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Zoom</label>
                      <span className="text-xs text-gray-500">{zoom.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.01"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Rotation</label>
                      <span className="text-xs text-gray-500">{rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Pan X */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Horizontal Position</label>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={canvasSize.width}
                      step="1"
                      value={panX}
                      onChange={(e) => setPanX(parseInt(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Pan Y */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Vertical Position</label>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={canvasSize.height}
                      step="1"
                      value={panY}
                      onChange={(e) => setPanY(parseInt(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Tip */}
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                    <strong>Tip:</strong> You can also drag the photo on the canvas to reposition, and scroll to zoom.
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleReset}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {downloading ? "Saving..." : "Download"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
