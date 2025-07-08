import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Download,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  extractDocxVariables,
  processDocxTemplate,
  matchDataWithDocxVariables,
} from "@/utils/docxTemplates";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

const DocxFormFiller = ({
  templateData,
  formData = {},
  onFormDataChange,
  onGenerate,
  fileName = "document.pdf",
  autoFillData = {},
}) => {
  const [variables, setVariables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fieldMatching, setFieldMatching] = useState(null);
  const [localFormData, setLocalFormData] = useState(formData);
  const [errorDialog, setErrorDialog] = useState({
    isOpen: false,
    title: "",
    content: "",
  });
  const lastAutoFillData = useRef({});
  const { toast } = useToast();

  // Extract variables from template when component mounts
  useEffect(() => {
    if (templateData) {
      extractVariablesFromTemplate();
    }
  }, [templateData]);

  // Auto-fill form data when available
  useEffect(() => {
    if (
      autoFillData &&
      Object.keys(autoFillData).length > 0 &&
      variables.length > 0
    ) {
      console.log("Auto-fill useEffect triggered:");
      console.log("- autoFillData:", autoFillData);
      console.log("- variables:", variables);
      console.log("- current localFormData:", localFormData);

      // Check if we need to auto-fill (either form is empty or autoFillData has changed)
      const hasNewData =
        JSON.stringify(autoFillData) !==
        JSON.stringify(lastAutoFillData.current);
      const isFormEmpty = Object.keys(localFormData).length === 0;

      console.log("- hasNewData:", hasNewData);
      console.log("- isFormEmpty:", isFormEmpty);

      if (hasNewData || isFormEmpty) {
        console.log("Proceeding with auto-fill...");
        lastAutoFillData.current = { ...autoFillData };
        autoFillFormData();
      } else {
        console.log("Skipping auto-fill - no new data and form not empty");
      }
    }
  }, [autoFillData, variables]);

  // Preview functionality removed - we now work directly with DOCX files

  const extractVariablesFromTemplate = async () => {
    try {
      setIsLoading(true);
      const extractedVariables = await extractDocxVariables(templateData);
      // Add default fields that should always appear
      const defaultFields = [
        {
          name: "tanggal_formulir_pengajuan",
          type: "text",
          label: "Tanggal Formulir Pengajuan",
        },
        {
          name: "tanggal_surat",
          type: "text",
          label: "Tanggal Surat",
        },
        {
          name: "nomor_surat",
          type: "text",
          label: "Nomor Surat",
        },
        {
          name: "kota",
          type: "text",
          label: "Kota",
        },
        {
          name: "tahun",
          type: "text",
          label: "Tahun",
        },
      ];

      // Merge extracted variables with default fields, avoiding duplicates
      const allVariables = [...extractedVariables];
      defaultFields.forEach((defaultField) => {
        const exists = extractedVariables.some(
          (v) => v.name === defaultField.name,
        );
        if (!exists) {
          allVariables.push(defaultField);
        }
      });

      setVariables(allVariables);

      if (extractedVariables.length === 0) {
        toast({
          title: "Tidak ada variabel ditemukan",
          description:
            "Template DOCX tidak mengandung variabel dalam format {{variabel}}. Field default tetap ditampilkan.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error extracting variables:", error);

      // Even if extraction fails, still show default fields
      const defaultFields = [
        {
          name: "tanggal_formulir_pengajuan",
          type: "text",
          label: "Tanggal Formulir Pengajuan",
        },
        {
          name: "tanggal_surat",
          type: "text",
          label: "Tanggal Surat",
        },
        {
          name: "nomor_surat",
          type: "text",
          label: "Nomor Surat",
        },
        {
          name: "kota",
          type: "text",
          label: "Kota",
        },
        {
          name: "tahun",
          type: "text",
          label: "Tahun",
        },
      ];
      setVariables(defaultFields);

      toast({
        title: "Gagal menganalisis template",
        description:
          "Terjadi kesalahan saat menganalisis template DOCX. Field default tetap ditampilkan.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const autoFillFormData = () => {
    if (!autoFillData || variables.length === 0) {
      console.log("Auto-fill skipped - no data or variables");
      return;
    }

    console.log("=== AUTO-FILL PROCESS START ===");
    console.log("Auto-filling form data:", autoFillData);
    console.log(
      "Available variables:",
      variables.map((v) => v.name),
    );

    // Enhanced matching with better field mapping
    const enhancedAutoFillData = {
      ...autoFillData,
      // Add alternative mappings for common fields
      position: autoFillData.jabatan || autoFillData.position,
      jabatan: autoFillData.jabatan || autoFillData.position,
      lama_cuti:
        autoFillData.lama_cuti ||
        autoFillData.duration ||
        autoFillData.durasi_hari,
      tanggal_cuti:
        autoFillData.tanggal_cuti ||
        autoFillData.leave_period ||
        autoFillData.periode_cuti,
      jatah_cuti_tahun:
        autoFillData.jatah_cuti_tahun ||
        autoFillData.leave_quota_year ||
        autoFillData.tahun,
    };

    console.log("Enhanced auto-fill data:", enhancedAutoFillData);

    // Match available data with template variables
    const matching = matchDataWithDocxVariables(
      enhancedAutoFillData,
      variables,
    );
    setFieldMatching(matching);

    console.log("Field matching result:", matching);

    // Auto-fill matched fields, preserving existing data
    const autoFilledData = { ...localFormData };
    let filledCount = 0;

    matching.matches.forEach((match) => {
      // Only fill if the field is currently empty or undefined
      if (
        !autoFilledData[match.variableName] ||
        autoFilledData[match.variableName] === ""
      ) {
        autoFilledData[match.variableName] = match.dataValue;
        filledCount++;
        console.log(`✓ Filled ${match.variableName} = ${match.dataValue}`);
      } else {
        console.log(
          `- Skipped ${match.variableName} (already has value: ${autoFilledData[match.variableName]})`,
        );
      }
    });

    // Also try direct mapping for common fields
    const directMappings = {
      jabatan: enhancedAutoFillData.jabatan,
      lama_cuti: enhancedAutoFillData.lama_cuti,
      tanggal_cuti: enhancedAutoFillData.tanggal_cuti,
      tanggal_formulir_pengajuan:
        enhancedAutoFillData.tanggal_formulir_pengajuan,
      tanggal_surat: enhancedAutoFillData.tanggal_surat,
      nomor_surat: enhancedAutoFillData.nomor_surat,
      kota: enhancedAutoFillData.kota,
      tahun: enhancedAutoFillData.tahun,
      nama: enhancedAutoFillData.nama,
      nip: enhancedAutoFillData.nip,
      unit_kerja: enhancedAutoFillData.unit_kerja,
      jenis_cuti: enhancedAutoFillData.jenis_cuti,
      alamat_selama_cuti: enhancedAutoFillData.alamat_selama_cuti,
      alasan: enhancedAutoFillData.alasan,
      nama_atasan: enhancedAutoFillData.nama_atasan,
      nip_atasan: enhancedAutoFillData.nip_atasan,
      jabatan_atasan: enhancedAutoFillData.jabatan_atasan,
      jatah_cuti_tahun: enhancedAutoFillData.jatah_cuti_tahun,
    };

    Object.entries(directMappings).forEach(([fieldName, value]) => {
      if (
        value &&
        (!autoFilledData[fieldName] || autoFilledData[fieldName] === "")
      ) {
        // Check if this field exists in variables
        const hasVariable = variables.some(
          (v) => v.name.toLowerCase() === fieldName.toLowerCase(),
        );
        if (hasVariable) {
          autoFilledData[fieldName] = value;
          filledCount++;
          console.log(`✓ Direct filled ${fieldName} = ${value}`);
        }
      }
    });

    console.log("Final auto-filled data:", autoFilledData);
    console.log(`Total fields filled: ${filledCount}`);
    console.log("=== AUTO-FILL PROCESS END ===");

    setLocalFormData(autoFilledData);
    if (onFormDataChange) {
      onFormDataChange(autoFilledData);
    }

    // Show auto-fill notification only if fields were actually filled
    if (filledCount > 0) {
      toast({
        title: "Data berhasil diisi otomatis",
        description: `${filledCount} field berhasil diisi dari data yang tersedia`,
        variant: "default",
      });
    }
  };

  // Preview functionality removed to focus on direct DOCX manipulation

  const handleFieldChange = (variableName, value) => {
    const updatedData = {
      ...localFormData,
      [variableName]: value,
    };
    setLocalFormData(updatedData);

    if (onFormDataChange) {
      onFormDataChange(updatedData);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const docxBlob = await processDocxTemplate(templateData, localFormData);

      if (onGenerate) {
        onGenerate(docxBlob, localFormData);
      }
    } catch (error) {
      console.error("Error generating DOCX:", error);
      setErrorDialog({
        isOpen: true,
        title: "Gagal Membuat Surat (Error Template)",
        content:
          error.message || "Terjadi kesalahan saat memproses template DOCX.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderVariableInput = (variable) => {
    const inputId = `docx-var-${variable.name}`;

    switch (variable.type) {
      case "textarea":
        return (
          <div key={variable.name} className="space-y-2">
            <Label htmlFor={inputId} className="text-slate-300">
              {variable.name}
            </Label>
            <Textarea
              id={inputId}
              name={variable.name}
              value={localFormData[variable.name] || ""}
              onChange={(e) => handleFieldChange(variable.name, e.target.value)}
              placeholder={`Masukkan ${variable.name}...`}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        );
      default:
        return (
          <div key={variable.name} className="space-y-2">
            <Label htmlFor={inputId} className="text-slate-300">
              {variable.name}
            </Label>
            <Input
              id={inputId}
              name={variable.name}
              type="text"
              value={localFormData[variable.name] || ""}
              onChange={(e) => handleFieldChange(variable.name, e.target.value)}
              placeholder={`Masukkan ${variable.name}...`}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        );
    }
  };

  const renderMatchingInfo = () => {
    if (!fieldMatching) return null;

    const { matches, unmatchedVariables } = fieldMatching;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
            Informasi Pengisian Otomatis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {matches.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">
                Field yang Berhasil Diisi ({matches.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {matches.map((match, index) => (
                  <div
                    key={index}
                    className="flex items-center text-xs bg-green-50 p-2 rounded"
                  >
                    <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                    <span className="font-mono">{match.variableName}</span>
                    <span className="mx-1">←</span>
                    <span className="text-green-700">{match.dataKey}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unmatchedVariables.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-700 mb-2">
                Field yang Perlu Diisi Manual ({unmatchedVariables.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {unmatchedVariables.map((variable, index) => (
                  <div
                    key={index}
                    className="flex items-center text-xs bg-yellow-50 p-2 rounded"
                  >
                    <AlertCircle className="w-3 h-3 mr-2 text-yellow-500" />
                    <span className="font-mono">{variable.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Menganalisis template DOCX...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog
        open={errorDialog.isOpen}
        onOpenChange={(isOpen) => setErrorDialog({ ...errorDialog, isOpen })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="w-6 h-6 mr-2 text-red-500" />
              {errorDialog.title}
            </DialogTitle>
            <DialogDescription>
              Terdapat kesalahan pada template DOCX Anda. Silakan periksa detail
              di bawah ini:
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 max-h-60 overflow-y-auto bg-slate-900 p-4 rounded-md">
            <pre className="text-sm text-red-300 whitespace-pre-wrap">
              {errorDialog.content}
            </pre>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setErrorDialog({ ...errorDialog, isOpen: false })}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderMatchingInfo()}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Isi Data untuk Template</CardTitle>
          <p className="text-sm text-slate-600">
            Lengkapi form di bawah ini untuk mengisi variabel dalam template
            DOCX. Dokumen akan diunduh sebagai file text dengan variabel yang
            sudah diisi. Untuk format DOCX asli, silakan copy-paste hasil ke
            Microsoft Word.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {variables.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variables.map(renderVariableInput)}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>Tidak ada variabel yang dapat diisi dalam template ini</p>
              <p className="text-sm mt-1">
                Pastikan template menggunakan format variabel{" "}
                {"{{nama_variabel}}"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={isLoading || isGenerating || variables.length === 0}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Membuat Surat...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Buat & Unduh Surat
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DocxFormFiller;
