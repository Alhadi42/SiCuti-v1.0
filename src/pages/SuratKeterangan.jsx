import React, { Component, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  User,
  Users,
  Download,
  Loader2,
  X,
  Check,
  Search,
  Calendar,
  FileUp,
  FileDown,
  FileCheck,
  FileX,
  FileSearch,
  FileInput,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Printer,
  FileSignature,
  Eye,
  FileArchive as FilePdfIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { formatDateRange } from "@/utils/dateFormatters";
import {
  countWorkingDays,
  fetchNationalHolidaysFromDB,
} from "@/utils/workingDays";
import { PDFDocument } from "pdf-lib";
import PdfFormFiller from "@/components/PdfFormFiller";
import {
  extractPdfFormFields,
  matchDataWithFormFields,
  generateFieldSuggestions,
} from "@/utils/pdfTemplates";

// Helper function to fetch PDF templates
const fetchTemplates = async (type = "pdf") => {
  try {
    // In a real app, fetch from your API
    const response = await fetch(`/api/templates?type=${type}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching templates:", error);
    return [];
  }
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="text-slate-300 mb-4">
            Maaf, terjadi kesalahan saat memuat halaman.
          </p>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => window.location.reload()}
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Dummy data for employees - in a real app, this would come from an API
const dummyEmployees = [
  {
    id: "1",
    nip: "198709012023012001",
    nama: "John Doe",
    jabatan: "Staf",
    unit_kerja: "Fakultas Teknik",
  },
  {
    id: "2",
    nip: "199004152023022002",
    nama: "Jane Smith",
    jabatan: "Dosen",
    unit_kerja: "Fakultas Kedokteran",
  },
  {
    id: "3",
    nip: "197512032001121001",
    nama: "Ahmad Budiman",
    jabatan: "Dekan",
    unit_kerja: "Fakultas Teknik",
  },
  {
    id: "4",
    nip: "1982061534567890",
    nama: "Siti Rahayu",
    jabatan: "Kepala Bagian",
    unit_kerja: "Fakultas Ekonomi",
  },
  {
    id: "5",
    nip: "1995112045678901",
    nama: "Budi Santoso",
    jabatan: "Staf",
    unit_kerja: "Fakultas Hukum",
  },
];

function SuratKeterangan() {
  // State management
  const [mode, setMode] = useState("individu");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLeaveRequests, setIsLoadingLeaveRequests] = useState(true);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableEmployees, setAvailableEmployees] = useState(dummyEmployees);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [tempSelectedEmployees, setTempSelectedEmployees] = useState([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfTemplates, setPdfTemplates] = useState([]);
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState(null);
  const [pdfFormFields, setPdfFormFields] = useState({});
  const [templateType, setTemplateType] = useState("pdf");
  const [availableFormFields, setAvailableFormFields] = useState([]);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [fieldMatching, setFieldMatching] = useState(null);
  const [holidays, setHolidays] = useState(new Set());
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Load PDF templates from localStorage
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const savedTemplates =
          JSON.parse(localStorage.getItem("savedTemplates")) || [];
        const pdfTemplates = savedTemplates.filter(
          (t) => t.type === "pdf" && t.content?.type === "pdf",
        );
        setPdfTemplates(pdfTemplates);
        setSavedTemplates(pdfTemplates);

        if (pdfTemplates.length > 0 && !selectedPdfTemplate) {
          const firstTemplate = pdfTemplates[0];
          setSelectedPdfTemplate(firstTemplate);
          setSelectedTemplate(firstTemplate);
          setPdfFormFields({});
          // Extract form fields from the first template
          if (firstTemplate.content?.data) {
            extractFormFields(firstTemplate.content.data);
          }
        }
      } catch (error) {
        console.error("Error loading PDF templates:", error);
        toast({
          title: "Gagal memuat template PDF",
          description: "Terjadi kesalahan saat memuat daftar template PDF",
          variant: "destructive",
        });
      }
    };

    loadTemplates();
  }, [toast]);

  // Load holidays from database
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        // Load holidays for current and next year
        const [currentYearHolidays, nextYearHolidays] = await Promise.all([
          fetchNationalHolidaysFromDB(currentYear),
          fetchNationalHolidaysFromDB(nextYear),
        ]);

        // Combine holidays from both years
        const allHolidays = new Set([
          ...currentYearHolidays,
          ...nextYearHolidays,
        ]);
        setHolidays(allHolidays);

        console.log(
          `📅 Loaded ${allHolidays.size} national holidays for ${currentYear}-${nextYear}`,
          Array.from(allHolidays),
        );

        if (allHolidays.size > 0) {
          toast({
            title: "📅 Hari Libur Nasional Dimuat",
            description: `${allHolidays.size} hari libur nasional telah dimuat untuk perhitungan yang akurat`,
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Failed to load national holidays:", error);
        toast({
          title: "Peringatan",
          description:
            "Gagal memuat data hari libur nasional. Perhitungan mungkin tidak akurat.",
          variant: "destructive",
        });
        // Set empty holidays set as fallback
        setHolidays(new Set());
      }
    };

    loadHolidays();
  }, [toast]);

  // Extract form fields from PDF template
  const extractFormFields = async (pdfData) => {
    try {
      const fields = await extractPdfFormFields(pdfData);
      console.log("Extracted PDF form fields:", fields);
      setAvailableFormFields(fields);

      // Analyze field matching if we have selected employee data
      if (selectedEmployees.length > 0) {
        const letterData = getLetterData(selectedEmployees[0]);
        const matching = matchDataWithFormFields(letterData, fields);
        setFieldMatching(matching);
        console.log("Field matching analysis:", matching);
      }
    } catch (error) {
      console.error("Error extracting form fields:", error);
      setAvailableFormFields([]);
      setFieldMatching(null);
    }
  };

  // Filter leave requests based on search query
  const filteredLeaveRequests = leaveRequests.filter((request) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      request.employees?.name?.toLowerCase().includes(query) ||
      request.employees?.nip?.includes(query) ||
      request.leave_types?.name?.toLowerCase().includes(query) ||
      request.reference_number?.toLowerCase().includes(query)
    );
  });

  // Filter employees based on search query
  const filteredEmployees = availableEmployees.filter(
    (employee) =>
      employee.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.nip.includes(searchQuery),
  );

  // Check if an employee is selected
  const isEmployeeSelected = (employee) => {
    return tempSelectedEmployees.some((e) => e.id === employee.id);
  };

  // Check if a leave request is selected
  const isLeaveRequestSelected = (request) => {
    return tempSelectedEmployees.some((r) => r.id === request.id);
  };

  // Toggle leave request selection
  const toggleLeaveRequestSelection = (request) => {
    if (mode === "individu") {
      setTempSelectedEmployees(
        isLeaveRequestSelected(request) ? [] : [request],
      );
    } else {
      setTempSelectedEmployees((prev) =>
        isLeaveRequestSelected(request)
          ? prev.filter((r) => r.id !== request.id)
          : [...prev, request],
      );
    }
  };

  // Save selected leave requests
  const saveSelectedLeaveRequests = () => {
    setSelectedEmployees([...tempSelectedEmployees]);
    setIsEmployeeDialogOpen(false);

    // Update field matching analysis when employees change
    if (tempSelectedEmployees.length > 0 && availableFormFields.length > 0) {
      const letterData = getLetterData(tempSelectedEmployees[0]);
      const matching = matchDataWithFormFields(letterData, availableFormFields);
      setFieldMatching(matching);
      console.log("Updated field matching analysis:", matching);
    }
  };

  // Close leave request dialog
  const closeLeaveRequestDialog = () => {
    setTempSelectedEmployees([...selectedEmployees]);
    setIsEmployeeDialogOpen(false);
  };

  // Toggle employee selection
  const toggleEmployeeSelection = (employee) => {
    if (mode === "individu") {
      // In individual mode, only one employee can be selected at a time
      setTempSelectedEmployees(isEmployeeSelected(employee) ? [] : [employee]);
    } else {
      // In batch mode, multiple employees can be selected
      setTempSelectedEmployees((prev) =>
        isEmployeeSelected(employee)
          ? prev.filter((e) => e.id !== employee.id)
          : [...prev, employee],
      );
    }
  };

  // Save selected employees and close dialog
  const saveSelectedEmployees = () => {
    setSelectedEmployees([...tempSelectedEmployees]);
    setIsEmployeeDialogOpen(false);
  };

  // Close employee dialog and reset selection
  const closeEmployeeDialog = () => {
    setTempSelectedEmployees([...selectedEmployees]);
    setIsEmployeeDialogOpen(false);
  };

  // Load saved templates
  useEffect(() => {
    // Implementation will go here
  }, []);

  // Fetch leave requests
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        setIsLoadingLeaveRequests(true);

        // Fetch leave requests with employee and leave type data
        const { data, error } = await supabase
          .from("leave_requests")
          .select(
            `
            *,
            employees (
              id,
              name,
              nip,
              rank_group,
              department
            ),
            leave_types (
              id,
              name
            )
          `,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        console.log("Fetched leave requests:", data);
        setLeaveRequests(data || []);
      } catch (error) {
        console.error("Error fetching leave requests:", error);
        toast({
          title: "Gagal memuat data cuti",
          description: "Terjadi kesalahan saat memuat data pengajuan cuti",
          variant: "destructive",
        });
      } finally {
        setIsLoadingLeaveRequests(false);
      }
    };

    fetchLeaveRequests();
  }, [toast]);

  // Format number to words in Indonesian
  const numberToWords = (num) => {
    if (num === 0) return "nol";

    const ones = [
      "",
      "satu",
      "dua",
      "tiga",
      "empat",
      "lima",
      "enam",
      "tujuh",
      "delapan",
      "sembilan",
    ];
    const teens = [
      "sepuluh",
      "sebelas",
      "dua belas",
      "tiga belas",
      "empat belas",
      "lima belas",
      "enam belas",
      "tujuh belas",
      "delapan belas",
      "sembilan belas",
    ];
    const tens = [
      "",
      "sepuluh",
      "dua puluh",
      "tiga puluh",
      "empat puluh",
      "lima puluh",
      "enam puluh",
      "tujuh puluh",
      "delapan puluh",
      "sembilan puluh",
    ];

    if (num < 10) return ones[num];
    if (num >= 10 && num < 20) return teens[num - 10];

    const ten = Math.floor(num / 10);
    const one = num % 10;

    if (one === 0) return tens[ten];
    return `${tens[ten]} ${ones[one]}`;
  };

  // Calculate working days between two dates (excluding weekends and national holidays)
  const calculateWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    return countWorkingDays(startDate, endDate, holidays);
  };

  // Format date to Indonesian locale (long format, e.g. "17 Juni 2025")
  const formatDateLong = (dateString) => {
    if (!dateString) return "-";
    try {
      const options = { day: "numeric", month: "long", year: "numeric" };
      return new Date(dateString).toLocaleDateString("id-ID", options);
    } catch (error) {
      console.error("Error formatting date (long):", error);
      return "-";
    }
  };

  // Format date to Indonesian locale (short format, e.g. "17-06-2023")
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const options = { day: "2-digit", month: "long", year: "numeric" };
      return new Date(dateString).toLocaleDateString("id-ID", options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  // Dummy data for template preview
  const dummyData = {
    nomor_surat: ".../.../...",
    nama: "Nama Pegawai",
    nip: "123456789012345678",
    pangkat_golongan: "III/a",
    jabatan: "Staf",
    unit_kerja: "Fakultas Teknik",
    jenis_cuti: "Tahunan",
    lama_cuti: "5 (lima) hari kerja",
    tanggal_mulai: formatDateLong(new Date().toISOString()),
    tanggal_selesai: formatDateLong(
      new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    ),
    tanggal_formulir_pengajuan: formatDateLong(new Date().toISOString()),
    alamat_selama_cuti: "Alamat selama cuti",
    nama_atasan: "Nama Atasan",
    nip_atasan: "987654321098765432",
    jabatan_atasan: "Kepala Bagian",
    tanggal_surat: formatDate(new Date().toISOString()),
    kota: "Kota",
    tahun: new Date().getFullYear().toString(),
    durasi_hari: "5",
    durasi_hari_terbilang: "lima",
    alasan: "Keperluan keluarga",
  };

  // Format leave request data for the letter template
  const getLetterData = (leaveRequest) => {
    if (!leaveRequest) return {};

    // Helper function to format dates consistently
    const formatDate = (dateString) => {
      if (!dateString) return "";
      try {
        const options = { day: "2-digit", month: "long", year: "numeric" };
        return new Date(dateString).toLocaleDateString("id-ID", options);
      } catch (error) {
        console.error("Error formatting date:", error);
        return "";
      }
    };

    // Handle API response format (from Supabase)
    if (leaveRequest.start_date && leaveRequest.end_date) {
      const startDate = new Date(leaveRequest.start_date);
      const endDate = new Date(leaveRequest.end_date);
      const durationDays =
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const workingDays = calculateWorkingDays(startDate, endDate);
      const today = new Date();

      return {
        nomor_surat: leaveRequest.reference_number || ".../.../...",
        nama:
          leaveRequest.employees?.name ||
          leaveRequest.nama_pegawai ||
          leaveRequest.nama ||
          "Nama Pegawai",
        nip:
          leaveRequest.employees?.nip ||
          leaveRequest.nip ||
          "NIP tidak tersedia",
        pangkat_golongan:
          leaveRequest.employees?.rank_group ||
          leaveRequest.pangkat_golongan ||
          "...",
        jabatan:
          leaveRequest.employees?.position ||
          leaveRequest.jabatan ||
          "Jabatan tidak tersedia",
        unit_kerja:
          leaveRequest.employees?.department ||
          leaveRequest.unit_kerja ||
          "Unit Kerja tidak tersedia",
        jenis_cuti:
          leaveRequest.leave_types?.name ||
          leaveRequest.jenis_cuti ||
          "Jenis Cuti tidak tersedia",
        lama_cuti: `${workingDays} (${numberToWords(workingDays)}) hari kerja`,
        tanggal_mulai: formatDateLong(
          leaveRequest.start_date || leaveRequest.tanggal_mulai,
        ),
        tanggal_selesai: formatDateLong(
          leaveRequest.end_date || leaveRequest.tanggal_selesai,
        ),
        tanggal_formulir_pengajuan: formatDateLong(
          leaveRequest.application_form_date ||
          leaveRequest.created_at ||
            leaveRequest.tanggal_pengajuan ||
            new Date().toISOString(),
        ),
        alamat_selama_cuti:
          leaveRequest.address_during_leave ||
          leaveRequest.alamat_selama_cuti ||
          "Alamat tidak tersedia",
        nama_atasan: leaveRequest.nama_atasan || "...",
        nip_atasan: leaveRequest.nip_atasan || "...",
        jabatan_atasan: leaveRequest.jabatan_atasan || "...",
        tanggal_surat: formatDate(leaveRequest.leave_letter_date || leaveRequest.created_at || new Date()),
        kota: leaveRequest.kota || "...",
        tahun: (leaveRequest.tanggal_surat
          ? new Date(leaveRequest.tanggal_surat)
          : new Date()
        ).getFullYear(),
        bulan: (leaveRequest.tanggal_surat
          ? new Date(leaveRequest.tanggal_surat)
          : new Date()
        ).toLocaleString("id-ID", { month: "long" }),
        durasi_hari: durationDays.toString(),
        durasi_hari_terbilang: numberToWords(durationDays),
        alasan: leaveRequest.reason || leaveRequest.alasan || "...",
      };
    }

    // Handle form data format (from UI state)
    const startDate = leaveRequest.tanggal_mulai
      ? new Date(leaveRequest.tanggal_mulai)
      : null;
    const endDate = leaveRequest.tanggal_selesai
      ? new Date(leaveRequest.tanggal_selesai)
      : null;
    const totalDays =
      startDate && endDate
        ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
        : 0;

    return {
      nama: leaveRequest.nama_pegawai || leaveRequest.nama || "Nama Pegawai",
      nip: leaveRequest.nip || "NIP tidak tersedia",
      jabatan: leaveRequest.jabatan || "Jabatan tidak tersedia",
      unit_kerja: leaveRequest.unit_kerja || "Unit Kerja tidak tersedia",
      jenis_cuti: leaveRequest.jenis_cuti || "Jenis Cuti tidak tersedia",
      alasan: leaveRequest.alasan || "Alasan tidak tersedia",
      tanggal_mulai: formatDate(leaveRequest.tanggal_mulai),
      tanggal_selesai: formatDate(leaveRequest.tanggal_selesai),
      tanggal_formulir_pengajuan: formatDateLong(
        leaveRequest.application_form_date ||
        leaveRequest.created_at ||
          leaveRequest.tanggal_pengajuan ||
          new Date().toISOString(),
      ),
      lama_cuti: totalDays,
      alamat_selama_cuti:
        leaveRequest.alamat_selama_cuti || "Alamat tidak tersedia",
      tanggal_surat: formatDate(leaveRequest.leave_letter_date || leaveRequest.created_at || new Date()),
      tahun: new Date().getFullYear(),
      bulan: new Date().toLocaleString("id-ID", { month: "long" }),
    };
  };

  // Replace variables in template with actual values
  const replaceVariables = (html, data) => {
    try {
      // Handle null or undefined html
      if (html === null || html === undefined) {
        return "";
      }

      // Convert to string if it's not already
      let result = String(html);

      // Return early if no data is provided
      if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
        return result;
      }

      // First replace all known variables
      Object.entries(data).forEach(([key, value]) => {
        try {
          // Skip if key is not a string or empty
          if (typeof key !== "string" || !key.trim()) return;

          // Convert value to string safely
          const stringValue =
            value !== null && value !== undefined ? String(value) : "";

          // Create and apply regex replacement
          const regex = new RegExp(`\\\\{\\\\{${key}\\\\}}`, "g");
          result = result.replace(regex, stringValue);
        } catch (e) {
          console.warn(`Error processing variable ${key}:`, e);
        }
      });

      // List of variables that should be preserved (not replaced) for external applications
      const preservedVariables = [
        'nomor_naskah',
        'ttd_pengirim'
      ];

      // Clean up any remaining variables that weren't in the data
      // Only if the result is a string (double check)
      if (typeof result === "string") {
        // Replace all unmatched variables except preserved ones
        result = result.replace(/\\{\\{([^}]+)\\}\\}/g, (match, variableName) => {
          if (preservedVariables.includes(variableName.trim())) {
            console.log(`Preserving variable for external application: {${variableName}}`);
            return match; // Keep the original variable
          }
          return ""; // Remove other unmatched variables
        });
      }

      return result;
    } catch (error) {
      console.error("Error in replaceVariables:", {
        error,
        htmlType: typeof html,
        dataType: data ? typeof data : "no data",
      });
      return String(html || "");
    }
  };

  // Handle PDF template selection
  const handlePdfTemplateSelect = (template) => {
    setSelectedPdfTemplate(template);
    // In a real app, fetch the PDF preview URL and form fields
    setPdfPreviewUrl(template.previewUrl || "");
    // Reset form fields when changing templates
    setPdfFormFields({});
  };

  // Render PDF template selection UI
  const renderTemplateSelection = () => (
    <div className="space-y-2">
      <Label>Pilih Template PDF</Label>
      {savedTemplates.length > 0 ? (
        <Select
          value={selectedTemplate?.id || ""}
          onValueChange={(value) => {
            const template = savedTemplates.find((t) => t.id === value);
            if (template) {
              setSelectedTemplate(template);
              setSelectedPdfTemplate(template);
              setPdfFormFields({});
              // Extract form fields when template changes
              if (template.content?.data) {
                extractFormFields(template.content.data);
              }
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih template PDF" />
          </SelectTrigger>
          <SelectContent>
            {savedTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center">
                  <FilePdfIcon className="w-4 h-4 mr-2 text-red-500" />
                  {template.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="p-4 border border-dashed rounded-lg text-center">
          <FilePdfIcon className="w-8 h-8 mx-auto mb-2 text-slate-500" />
          <p className="text-sm text-slate-400 mb-2">
            Belum ada template PDF tersedia
          </p>
          <Button
            variant="link"
            className="text-blue-400 p-0 h-auto"
            onClick={() => (window.location.href = "/kelola-template")}
          >
            Buat template baru di halaman Kelola Template
          </Button>
        </div>
      )}

      {selectedTemplate && (
        <div className="mt-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <FilePdfIcon className="w-4 h-4 mr-2 text-red-500" />
                <h4 className="font-medium text-slate-200">
                  {selectedTemplate.name}
                </h4>
              </div>
              {selectedTemplate.description && (
                <p className="text-sm text-slate-400 mb-2">
                  {selectedTemplate.description}
                </p>
              )}
              <div className="text-xs text-slate-500 space-y-1">
                <div>
                  File: {selectedTemplate.content?.fileName || "template.pdf"}
                </div>
                <div>
                  Ukuran:{" "}
                  {selectedTemplate.content?.size
                    ? (selectedTemplate.content.size / 1024).toFixed(1) + " KB"
                    : "N/A"}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              onClick={() => {
                if (selectedTemplate.content?.data) {
                  // Create blob URL for PDF preview
                  const byteCharacters = atob(
                    selectedTemplate.content.data.split(",")[1],
                  );
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], {
                    type: "application/pdf",
                  });
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank");
                }
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              Pratinjau
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Handle PDF form field changes
  const handlePdfFormChange = (fieldName, value) => {
    setPdfFormFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Generate PDF document with filled data
  const generatePdfDocument = async () => {
    if (!selectedTemplate || !selectedTemplate.content?.data) {
      toast({
        title: "Template tidak tersedia",
        description: "Silakan pilih template PDF terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (selectedEmployees.length === 0) {
      toast({
        title: "Data pegawai tidak tersedia",
        description: "Silakan pilih data cuti pegawai terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const selectedLeaveRequest = selectedEmployees[0];
      const letterData = getLetterData(selectedLeaveRequest);

      // Convert base64 to array buffer
      const base64Data = selectedTemplate.content.data.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const pdfBytes = new Uint8Array(byteNumbers);

      // Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Get all form fields
      const fields = form.getFields();
      const fieldNames = fields.map((f) => f.getName());
      console.log("Available form fields:", fieldNames);
      console.log("Letter data to fill:", letterData);

      // Create a comprehensive mapping of possible field names
      const createFieldVariations = (key) => {
        const variations = [
          key,
          key.toLowerCase(),
          key.toUpperCase(),
          key.replace(/_/g, " "),
          key.replace(/_/g, ""),
          key.replace(/_/g, "-"),
          `{{${key}}}`,
          key.charAt(0).toUpperCase() + key.slice(1),
          key
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(""),
          key
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
        ];
        return [...new Set(variations)]; // Remove duplicates
      };

      // Fill form fields with letter data
      let filledFieldsCount = 0;
      Object.entries(letterData).forEach(([key, value]) => {
        try {
          const possibleNames = createFieldVariations(key);
          let fieldFound = false;

          for (const fieldName of possibleNames) {
            try {
              const field = form.getField(fieldName);
              if (field) {
                const fieldType = field.constructor.name;
                const stringValue = String(value || "");

                if (fieldType === "PDFTextField") {
                  field.setText(stringValue);
                } else if (fieldType === "PDFCheckBox") {
                  field.check(Boolean(value));
                } else if (fieldType === "PDFDropdown") {
                  field.select(stringValue);
                } else {
                  field.setText(stringValue);
                }

                fieldFound = true;
                filledFieldsCount++;
                console.log(
                  `✓ Filled field '${fieldName}' (${fieldType}) with '${stringValue}'`,
                );
                break;
              }
            } catch (e) {
              // Field doesn't exist or can't be filled, continue
            }
          }

          if (!fieldFound) {
            console.warn(
              `⚠ Field for '${key}' not found in PDF form. Tried: ${possibleNames.join(", ")}`,
            );
          }
        } catch (err) {
          console.warn(`Error filling field '${key}':`, err);
        }
      });

      console.log(
        `Successfully filled ${filledFieldsCount} out of ${Object.keys(letterData).length} data fields`,
      );
      console.log(`PDF has ${fieldNames.length} total form fields`);

      // Show detailed feedback about field filling
      if (filledFieldsCount === 0 && fieldNames.length > 0) {
        toast({
          title: "⚠ Field tidak cocok",
          description: `PDF memiliki ${fieldNames.length} form fields, tetapi tidak ada yang cocok dengan data. Lihat tab 'Lihat Info' untuk detail pencocokan field.`,
          variant: "destructive",
        });
        console.log("Available PDF fields:", fieldNames);
        console.log("Available data keys:", Object.keys(letterData));
      } else if (fieldNames.length === 0) {
        toast({
          title: "⚠ Tidak ada form fields",
          description:
            "PDF template tidak memiliki form fields yang dapat diisi. Pastikan PDF dibuat dengan form fields yang dapat diedit.",
          variant: "destructive",
        });
      } else if (filledFieldsCount > 0) {
        const percentage = Math.round(
          (filledFieldsCount / fieldNames.length) * 100,
        );
        toast({
          title: `✓ ${filledFieldsCount} field berhasil diisi`,
          description: `${percentage}% dari form fields PDF telah diisi dengan data pegawai.`,
          variant: "default",
        });
      }

      // Flatten the form to make it non-editable
      form.flatten();

      // Save the filled PDF
      const filledPdfBytes = await pdfDoc.save();
      const blob = new Blob([filledPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Open in new window for preview/print
      const printWindow = window.open(url, "_blank");
      if (!printWindow) {
        // Fallback: download the file
        const link = document.createElement("a");
        link.href = url;
        link.download = `Surat_Keterangan_${letterData.nama?.replace(/\s+/g, "_") || "Pegawai"}_${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Surat berhasil dibuat",
          description: "File PDF telah diunduh ke perangkat Anda",
        });
      } else {
        toast({
          title: "Surat berhasil dibuat",
          description:
            "Surat telah dibuka di tab baru untuk pratinjau dan pencetakan",
        });
      }

      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000); // Clean up after 1 minute
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Gagal membuat surat",
        description:
          error.message || "Terjadi kesalahan saat membuat surat PDF",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate the final letter (updated to use PDF)
  const generateLetter = () => {
    generatePdfDocument();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Surat Keterangan Cuti
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${holidays.size > 0 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}
            >
              📅 Hari Libur:{" "}
              {holidays.size > 0
                ? `${holidays.size} hari dimuat`
                : "Belum dimuat"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Pane - Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Pengaturan Surat
            </h2>

            <div className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template-selection" className="text-sm font-medium text-slate-300">
                  Pilih Template
                </Label>
                {renderTemplateSelection()}
              </div>

              {/* Employee Selection */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setTempSelectedEmployees([...selectedEmployees]);
                    setIsEmployeeDialogOpen(true);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  {mode === "individu"
                    ? "Pilih Pegawai"
                    : "Pilih Daftar Pegawai"}
                </Button>
                <Label htmlFor="employee-selection" className="text-sm font-medium text-slate-300">
                  {mode === "individu" ? "Pegawai" : "Daftar Pegawai"}
                </Label>
                <Tabs value={mode} onValueChange={setMode} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="individu">Perorangan</TabsTrigger>
                    <TabsTrigger value="gabungan">Gabungan</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="border border-slate-600 rounded-lg p-3 bg-slate-700/50">
                  {mode === "individu" ? (
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-300">
                        {selectedEmployees.length > 0
                          ? selectedEmployees[0]?.employees?.name ||
                            "Pegawai dipilih"
                          : "Pilih pegawai"}
                      </span>
                    </div>
                  ) : selectedEmployees.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEmployees.map((request) => {
                        const startDate = request.start_date
                          ? new Date(request.start_date)
                          : null;
                        const endDate = request.end_date
                          ? new Date(request.end_date)
                          : null;
                        const durationDays =
                          startDate && endDate
                            ? Math.ceil(
                                (endDate - startDate) / (1000 * 60 * 60 * 24),
                              ) + 1
                            : 0;

                        return (
                          <div
                            key={request.id}
                            className="p-3 bg-slate-800/50 rounded-md border border-slate-700/50"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="font-medium truncate">
                                    {request.employees?.name ||
                                      "Nama tidak tersedia"}
                                  </div>
                                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                                    {request.leave_types?.name ||
                                      "Tidak Diketahui"}
                                  </span>
                                </div>
                                <div className="text-sm text-slate-400 mt-1">
                                  {request.employees?.nip || "NIP: -"} •{" "}
                                  {request.employees?.department || "Divisi: -"}
                                </div>
                                <div className="flex items-center text-xs text-slate-400 mt-1">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {startDate
                                    ? startDate.toLocaleDateString("id-ID")
                                    : "-"}
                                  <span className="mx-1">s.d.</span>
                                  {endDate
                                    ? endDate.toLocaleDateString("id-ID")
                                    : "-"}
                                  <span className="mx-2">•</span>
                                  <span>{durationDays} hari</span>
                                </div>
                                {request.reference_number && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    No. Ref: {request.reference_number}
                                  </div>
                                )}
                                {request.reason && (
                                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    <span className="font-medium">Alasan:</span>{" "}
                                    {request.reason}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 ml-2 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEmployees(
                                    selectedEmployees.filter(
                                      (e) => e.id !== request.id,
                                    ),
                                  );
                                }}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Hapus</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400">
                      <p>Belum ada pengajuan cuti dipilih</p>
                      <p className="text-xs mt-1">
                        Klik tombol di atas untuk memilih pengajuan cuti
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              className="w-full mt-4"
              onClick={generateLetter}
              disabled={isLoading || !selectedTemplate}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Unduh Surat
                </>
              )}
            </Button>
          </div>

          {/* Template Form Fields Info */}
          {selectedTemplate && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Form Fields Template
              </h3>
              {availableFormFields.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-green-400 mb-2">
                    ✓ Template memiliki {availableFormFields.length} form
                    fields
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {availableFormFields.map((field, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-700/50 rounded text-xs"
                      >
                        <code className="text-blue-300 font-mono">
                          {field.name}
                        </code>
                        <span className="text-slate-400">({field.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-yellow-400 mb-2">
                    ⚠ Tidak ada form fields terdeteksi
                  </div>
                  <div className="text-xs text-slate-400 space-y-2">
                    <p>
                      Template PDF harus memiliki form fields untuk dapat diisi
                      otomatis.
                    </p>
                    <p className="font-medium text-slate-300">
                      Cara membuat PDF dengan form fields:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Gunakan Adobe Acrobat Pro</li>
                      <li>
                        Atau LibreOffice Writer → Export as PDF dengan form
                        fields
                      </li>
                      <li>Atau Google Docs → Download as PDF (dengan form)</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Data Fields Available */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-2">
                  Data Tersedia untuk Diisi
                </h4>
                <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                  {Object.entries(dummyData).map(([key]) => (
                    <div key={key} className="flex items-start">
                      <code className="text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded">
                        {key}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              💡 Panduan Penggunaan
            </h3>
            <div className="text-sm text-slate-300 space-y-2">
              <p>
                <strong>1. Template PDF:</strong> Harus memiliki form fields
                yang dapat diedit
              </p>
              <p>
                <strong>2. Nama Fields:</strong> Harus sesuai dengan data yang
                tersedia (misal: nama, nip, jabatan)
              </p>
              <p>
                <strong>3. Preview:</strong> Klik "Pratinjau PDF" untuk melihat
                hasil akhir
              </p>
              <p>
                <strong>4. Download:</strong> Klik "Unduh Surat" untuk
                mendapatkan PDF terisi
              </p>
            </div>
          </div>
        </div>

        {/* Right Pane - Preview */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-lg p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">
                {selectedTemplate ? selectedTemplate.name : "Pratinjau Surat"}
              </h2>
              <div className="flex items-center space-x-2">
                {selectedTemplate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPdfPreview(!showPdfPreview)}
                  >
                    {showPdfPreview ? "Lihat Info" : "Pratinjau PDF"}
                  </Button>
                )}
                {isLoading && (
                  <div className="flex items-center text-sm text-slate-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memuat pratinjau...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg h-[calc(100%-50px)] overflow-hidden">
              {selectedTemplate ? (
                showPdfPreview ? (
                  <div className="h-full">
                    <PdfFormFiller
                      templateData={selectedTemplate.content?.data}
                      formData={
                        selectedEmployees.length > 0
                          ? getLetterData(selectedEmployees[0])
                          : dummyData
                      }
                      fileName={`Surat_Keterangan_${selectedEmployees.length > 0 ? selectedEmployees[0].employees?.name?.replace(/\s+/g, "_") || "Pegawai" : "Preview"}.pdf`}
                    />
                  </div>
                ) : (
                  <div className="p-6 h-full overflow-y-auto">
                    {/* Template Info */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Informasi Template
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">
                              Nama:
                            </span>
                            <p className="text-gray-800">
                              {selectedTemplate.name}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">
                              Tipe:
                            </span>
                            <p className="text-gray-800">PDF Template</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">
                              Ukuran:
                            </span>
                            <p className="text-gray-800">
                              {selectedTemplate.content?.size
                                ? (
                                    selectedTemplate.content.size / 1024
                                  ).toFixed(1) + " KB"
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">
                              Diperbarui:
                            </span>
                            <p className="text-gray-800">
                              {new Date(
                                selectedTemplate.updatedAt,
                              ).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields Info */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Form Fields Terdeteksi
                      </h3>
                      {availableFormFields.length > 0 ? (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-green-700 mb-3">
                            ✓ Template memiliki {availableFormFields.length}{" "}
                            form fields yang dapat diisi:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {availableFormFields.map((field, index) => (
                              <div
                                key={index}
                                className="text-xs bg-white p-2 rounded border"
                              >
                                <span className="font-mono text-blue-600">
                                  {field.name}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  ({field.type})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            ⚠ Template tidak memiliki form fields yang
                            terdeteksi. Pastikan PDF template memiliki form
                            fields yang dapat diedit.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Field Matching Analysis */}
                    {selectedEmployees.length > 0 && fieldMatching && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          Analisis Pencocokan Field
                        </h3>

                        {/* Matched Fields */}
                        {fieldMatching.matches.length > 0 && (
                          <div className="bg-green-50 p-4 rounded-lg mb-3">
                            <h4 className="text-sm font-semibold text-green-800 mb-2">
                              ✓ Field yang Cocok ({fieldMatching.matches.length}
                              )
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {fieldMatching.matches.map((match, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center text-xs bg-white p-2 rounded border"
                                >
                                  <span className="font-mono text-green-600">
                                    {match.dataKey}
                                  </span>
                                  <span className="text-gray-500">→</span>
                                  <span className="font-mono text-blue-600">
                                    {match.fieldName}
                                  </span>
                                  <span className="text-gray-400">
                                    ({match.fieldType})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Unmatched Data */}
                        {fieldMatching.unmatchedData.length > 0 && (
                          <div className="bg-yellow-50 p-4 rounded-lg mb-3">
                            <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                              ⚠ Data Tanpa Field (
                              {fieldMatching.unmatchedData.length})
                            </h4>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {fieldMatching.unmatchedData.map(
                                (data, index) => (
                                  <div
                                    key={index}
                                    className="text-xs bg-white p-2 rounded border"
                                  >
                                    <span className="font-mono text-yellow-600">
                                      {data.key}
                                    </span>
                                    <span className="text-gray-500 ml-2">
                                      : {String(data.value).substring(0, 30)}...
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {/* Unmatched Fields */}
                        {fieldMatching.unmatchedFields.length > 0 && (
                          <div className="bg-red-50 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-red-800 mb-2">
                              ✗ Field Kosong (
                              {fieldMatching.unmatchedFields.length})
                            </h4>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {fieldMatching.unmatchedFields.map(
                                (field, index) => (
                                  <div
                                    key={index}
                                    className="text-xs bg-white p-2 rounded border"
                                  >
                                    <span className="font-mono text-red-600">
                                      {field.name}
                                    </span>
                                    <span className="text-gray-400 ml-2">
                                      ({field.type})
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Data Preview */}
                    {selectedEmployees.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          Data Pegawai Terpilih
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                            {Object.entries(
                              getLetterData(selectedEmployees[0]),
                            ).map(([key, value]) => (
                              <div
                                key={key}
                                className="flex justify-between items-center text-xs border-b border-gray-200 pb-1"
                              >
                                <span className="font-mono text-blue-600">
                                  {key}:
                                </span>
                                <span className="text-gray-700 truncate ml-2 max-w-xs">
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-center py-12 text-slate-400">
                  <div>
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">
                      Belum ada template yang dipilih
                    </p>
                    <p className="text-sm mt-1">
                      {savedTemplates.length === 0
                        ? "Buat template terlebih dahulu di halaman Manajemen Template"
                        : "Pilih template untuk melihat pratinjau"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leave Request Selection Dialog */}
      <Dialog
        open={isEmployeeDialogOpen}
        onOpenChange={setIsEmployeeDialogOpen}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {mode === "individu"
                ? "Pilih Pengajuan Cuti"
                : "Pilih Daftar Pengajuan Cuti"}
            </DialogTitle>
            <DialogDescription>
              {mode === "individu"
                ? "Pilih satu pengajuan cuti untuk surat keterangan perorangan"
                : "Pilih beberapa pengajuan cuti untuk surat keterangan gabungan"}
            </DialogDescription>
          </DialogHeader>

          <div className="relative my-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="search-leave-requests"
              name="search-leave-requests"
              type="text"
              placeholder="Cari berdasarkan nama, NIP, jenis cuti, atau nomor referensi..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="flex-1 border rounded-md p-2 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-slate-800/20 hover:scrollbar-thumb-slate-600/80">
            <div className="space-y-2">
              {isLoadingLeaveRequests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : filteredLeaveRequests.length > 0 ? (
                filteredLeaveRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-3 rounded-md cursor-pointer ${
                      isLeaveRequestSelected(request)
                        ? "bg-blue-500/20 border border-blue-500/30"
                        : "hover:bg-slate-700/50 border border-transparent"
                    }`}
                    onClick={() => toggleLeaveRequestSelection(request)}
                  >
                    <div className="flex items-start">
                      <div
                        className={`w-5 h-5 rounded-full border flex-shrink-0 mt-1 flex items-center justify-center mr-3 ${
                          isLeaveRequestSelected(request)
                            ? "bg-blue-500 border-blue-500"
                            : "border-slate-500"
                        }`}
                      >
                        {isLeaveRequestSelected(request) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="font-medium truncate">
                            {request.employees?.name || "Nama tidak tersedia"}
                          </div>
                          <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                            {request.leave_types?.name || "Tidak Diketahui"}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {request.employees?.nip || "NIP: -"} •{" "}
                          {request.employees?.department || "Divisi: -"}
                        </div>
                        <div className="flex items-center text-xs text-slate-400 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(request.start_date)} -{" "}
                          {formatDate(request.end_date)}
                        </div>
                        {request.reference_number && (
                          <div className="text-xs text-slate-500 mt-1">
                            No. Ref: {request.reference_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>Tidak ada pengajuan cuti ditemukan</p>
                  <p className="text-xs mt-1">
                    {searchQuery
                      ? "Coba kata kunci pencarian lain"
                      : "Tidak ada data pengajuan cuti yang tersedia"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeLeaveRequestDialog}>
              Batal
            </Button>
            <Button
              onClick={saveSelectedLeaveRequests}
              disabled={tempSelectedEmployees.length === 0}
            >
              Simpan ({tempSelectedEmployees.length} dipilih)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SuratKeterangan;
