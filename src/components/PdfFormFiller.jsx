import React, { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PdfFormFiller = ({
  templateUrl,
  templateData, // New prop for base64 PDF data
  formData,
  onSave,
  onDownload,
  onPrint,
  fileName = "document.pdf",
}) => {
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  const { toast } = useToast();

  // Load and fill the PDF when the component mounts or when the template/formData changes
  useEffect(() => {
    let isMounted = true;

    const loadAndFillPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let pdfBytes;

        // 1. Load PDF template from URL or base64 data
        if (templateData) {
          // Convert base64 to array buffer
          const base64Data = templateData.split(",")[1]; // Remove data:application/pdf;base64, prefix
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          pdfBytes = new Uint8Array(byteNumbers).buffer;
        } else if (templateUrl) {
          // Fetch from URL (fallback)
          const response = await fetch(templateUrl);
          if (!response.ok) throw new Error("Failed to load PDF template");
          pdfBytes = await response.arrayBuffer();
        } else {
          throw new Error("No template data or URL provided");
        }

        // 2. Load the PDF document
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        // 3. Fill form fields with provided data
        Object.entries(formData).forEach(([fieldName, value]) => {
          try {
            const field = form.getField(fieldName);
            if (field) {
              field.setText(value?.toString() || "");
            }
          } catch (err) {
            console.warn(`Field '${fieldName}' not found in PDF form`);
          }
        });

        // 4. Flatten the form to make it non-editable
        form.flatten();

        // 5. Save the filled PDF
        const filledPdfBytes = await pdfDoc.save();
        const blob = new Blob([filledPdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setPdfUrl(url);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading/filling PDF:", err);
        if (isMounted) {
          setError(err.message || "Failed to load PDF");
          setIsLoading(false);
        }
      }
    };

    loadAndFillPdf();

    return () => {
      isMounted = false;
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [templateUrl, templateData, formData]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onDownload) {
        onDownload();
      }
    }
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    }

    if (onPrint) {
      onPrint();
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(pdfUrl);
    }
  };

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading PDF...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF Viewer */}
      <div className="flex-1 border rounded-md overflow-hidden bg-gray-100">
        {pdfUrl && (
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            className="w-full h-full min-h-[500px]"
            title="PDF Viewer"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
};

export default PdfFormFiller;
