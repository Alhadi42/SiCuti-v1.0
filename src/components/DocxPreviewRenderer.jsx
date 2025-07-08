import React, { useState, useEffect, useRef } from "react";
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDocxPreview } from "@/utils/docxTemplates";

const DocxPreviewRenderer = ({
  docxData,
  variables = {},
  onPreviewGenerated,
  className = "",
  showControls = true,
}) => {
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(100);
  const previewRef = useRef(null);

  useEffect(() => {
    if (docxData) {
      generatePreview();
    }
  }, [docxData, variables]);

  const generatePreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Generating enhanced DOCX preview...");
      const html = await generateDocxPreview(docxData, variables);
      setPreviewHtml(html);

      if (onPreviewGenerated) {
        onPreviewGenerated(html);
      }
    } catch (err) {
      console.error("Error generating preview:", err);
      setError("Gagal membuat preview: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handlePrint = () => {
    if (previewRef.current) {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Preview Template</title>
            <style>
              @page {
                margin: 1in;
                size: A4;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
                line-height: 1.5;
              }
              @media print {
                body {
                  background: white !important;
                  -webkit-print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            ${previewHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center min-h-96 bg-gray-50 rounded-lg border ${className}`}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Membuat preview template...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center min-h-96 bg-red-50 rounded-lg border border-red-200 ${className}`}
      >
        <div className="text-center p-6">
          <FileText className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Gagal Membuat Preview
          </h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button
            onClick={generatePreview}
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300 hover:bg-red-50"
          >
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!previewHtml) {
    return (
      <div
        className={`flex items-center justify-center min-h-96 bg-gray-50 rounded-lg border ${className}`}
      >
        <div className="text-center p-6">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Tidak ada preview tersedia</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${className}`}>
      {showControls && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              Preview Template
            </span>
            <span className="text-xs text-gray-500">({zoom}%)</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-2"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetZoom}
              className="p-2"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-2"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePrint}
              className="p-2"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-auto max-h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div
          ref={previewRef}
          className="mx-auto bg-white shadow-xl border border-gray-200"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            width: zoom === 100 ? "100%" : `${100 * (100 / zoom)}%`,
            transition: "transform 0.2s ease-in-out",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            borderRadius: "2px",
          }}
        >
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

              .docx-preview-container {
                font-family: 'Crimson Text', 'Times New Roman', 'Liberation Serif', serif;
                font-size: 12pt;
                line-height: 1.5;
                color: #000;
                background: #fff;
                padding: 1in;
                min-height: 11in;
                width: 8.5in;
                margin: 0 auto;
                box-sizing: border-box;
                page-break-inside: avoid;
              }

              .docx-preview-container p {
                margin: 0 0 6pt 0;
                text-align: justify;
                text-indent: 0;
                padding: 0;
                orphans: 2;
                widows: 2;
              }

              .docx-preview-container h1,
              .docx-preview-container h2,
              .docx-preview-container h3 {
                margin: 12pt 0 6pt 0;
                page-break-after: avoid;
                font-weight: bold;
              }

              .docx-preview-container h1 {
                font-size: 16pt;
                text-align: center;
              }

              .docx-preview-container h2 {
                font-size: 14pt;
              }

              .docx-preview-container h3 {
                font-size: 12pt;
              }

              .docx-preview-container strong {
                font-weight: bold;
              }

              .docx-preview-container em {
                font-style: italic;
              }

              .docx-preview-container u {
                text-decoration: underline;
              }

              .docx-preview-container table {
                width: 100%;
                border-collapse: collapse;
                margin: 6pt 0;
                font-size: 11pt;
              }

              .docx-preview-container td,
              .docx-preview-container th {
                border: 1pt solid #000;
                padding: 3pt 6pt;
                vertical-align: top;
                text-align: left;
              }

              .docx-preview-container th {
                font-weight: bold;
                background-color: #f0f0f0;
              }

              .docx-preview-container .header {
                margin-bottom: 12pt;
                padding-bottom: 6pt;
                border-bottom: 1pt solid #000;
                text-align: center;
                font-weight: bold;
              }

              .docx-preview-container .footer {
                margin-top: 12pt;
                padding-top: 6pt;
                border-top: 1pt solid #000;
                text-align: center;
                font-size: 10pt;
              }

              .docx-preview-container pre {
                white-space: pre-wrap;
                font-family: 'Times New Roman', serif;
                margin: 0;
              }

              .docx-preview-container ul,
              .docx-preview-container ol {
                margin: 6pt 0 6pt 24pt;
                padding: 0;
              }

              .docx-preview-container li {
                margin: 0 0 3pt 0;
              }

              .docx-preview-container img {
                max-width: 100%;
                height: auto;
              }

              /* Preserve specific alignments */
              .docx-preview-container [style*="text-align: center"] {
                text-align: center !important;
              }

              .docx-preview-container [style*="text-align: right"] {
                text-align: right !important;
              }

              .docx-preview-container [style*="text-align: justify"] {
                text-align: justify !important;
              }

              /* Variable highlighting */
              .docx-preview-container [style*="background-color: #fff3cd"] {
                background-color: #fff3cd !important;
                color: #856404 !important;
                padding: 1px 4px !important;
                border-radius: 2px !important;
                font-size: 0.9em !important;
              }
            `}
          </style>
          <div
            className="docx-preview-container"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
};

export default DocxPreviewRenderer;
