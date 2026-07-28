import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import {
  Maximize2, ZoomIn, ZoomOut, RotateCcw, Download, Image, X, Sparkles
} from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  flowchart: {
    htmlLabels: true,
    useMaxWidth: false,
    padding: 20,
    nodeSpacing: 45,
    rankSpacing: 45,
    curve: 'basis',
  },
  sequence: {
    useMaxWidth: false,
    boxMargin: 12,
    noteMargin: 12,
  },
  themeCSS: `
    .node foreignObject { overflow: visible !important; }
    .node foreignObject div { white-space: nowrap !important; padding: 4px 12px !important; display: inline-block !important; }
    .label foreignObject { overflow: visible !important; }
    .cluster-label span, .cluster-label div { white-space: nowrap !important; padding: 4px 10px !important; font-weight: 600 !important; }
    .node label { font-family: inherit; }
    svg { overflow: visible !important; }
  `,
  themeVariables: {
    darkMode: true,
    background: '#0a101d',
    fontSize: '13px',
    primaryColor: '#1e293b',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#38bdf8',
    lineColor: '#38bdf8',
    secondaryColor: '#0f172a',
    tertiaryColor: '#1e293b',
    nodeBorder: '#38bdf8',
    clusterBkg: '#0f172a',
    clusterBorder: '#334155',
    defaultLinkColor: '#38bdf8',
    titleColor: '#f8fafc',
    edgeLabelBackground: '#0f172a',
  },
});

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalCanvasRef = useRef<HTMLDivElement>(null);

  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Modal & Pan/Zoom State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (!chart || !chart.trim()) return;

      const uniqueId = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;

      try {
        const cleanChart = chart.trim();
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        console.warn('Mermaid rendering notice:', err);
        if (isMounted) {
          setError(err?.message || 'Invalid diagram syntax.');
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  // Modal keyboard listener (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.15, 4.0));
    } else {
      setZoom((prev) => Math.max(prev - 0.15, 0.4));
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Download SVG
  const handleDownloadSVG = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svgContent]);

  // Download PNG
  const handleDownloadPNG = useCallback(() => {
    if (!svgContent) return;

    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = document.createElement('img');

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // Crisp resolution multiplier
      const width = (img.naturalWidth || img.width || 800) * scale;
      const height = (img.naturalHeight || img.height || 600) * scale;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill dark background for diagram canvas
        ctx.fillStyle = '#0a101d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `diagram-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [svgContent]);

  if (error) {
    return (
      <div className="my-3 p-3 text-xs border rounded-xl bg-slate-900/90 border-slate-800 text-slate-300">
        <div className="flex items-center space-x-1.5 text-amber-400 font-medium mb-1">
          <span>⚠️ Diagram View (Raw Syntax)</span>
        </div>
        <pre className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <>
      {/* ── Inline Diagram Thumbnail Preview */}
      <div
        ref={containerRef}
        onClick={() => setIsModalOpen(true)}
        className="group relative my-3 p-4 glass-panel border border-slate-800/80 hover:border-indigo-500/50 rounded-xl overflow-x-auto flex justify-center items-center bg-slate-950/60 shadow-lg min-h-[120px] cursor-pointer transition-all duration-200"
        title="Click to expand, zoom & save"
      >
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />

        {/* Hover overlay indicator */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-[2px]">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-600/90 text-white text-xs font-semibold shadow-lg transform group-hover:scale-105 transition-transform">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Click to Expand & Zoom</span>
          </div>
        </div>
      </div>

      {/* ── Pop-out Fullscreen Lightbox Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between animate-fadeIn">

          {/* Modal Header Controls Toolbar */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-10">

            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-100">Interactive Diagram Viewer</span>
            </div>

            {/* Controls */}
            <div className="flex items-center flex-wrap gap-2">

              {/* Zoom controls */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-all"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="px-2 py-1 hover:bg-slate-800 text-indigo-300 font-mono font-medium rounded-lg transition-all text-[11px]"
                  title="Reset Zoom (100%)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-all"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                  title="Reset Pan & Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Save / Export buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleDownloadSVG}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all"
                  title="Save as SVG Vector File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>SVG</span>
                </button>

                <button
                  onClick={handleDownloadPNG}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs font-semibold transition-all"
                  title="Save as Image File (PNG)"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all ml-2"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Interactive Pan & Zoom Canvas */}
          <div
            ref={modalCanvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex-1 overflow-hidden flex items-center justify-center p-6 select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                transformOrigin: 'center center',
              }}
              className="max-w-full max-h-full"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>

          {/* Modal Footer Instructions */}
          <div className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-2 text-center">
            <span className="text-[11px] text-slate-400">
              💡 <b>Tip:</b> Click & drag to pan · Scroll mouse wheel to zoom in/out · Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Esc</kbd> to exit
            </span>
          </div>
        </div>
      )}
    </>
  );
};
