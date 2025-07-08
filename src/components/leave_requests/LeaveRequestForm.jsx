import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Search, X } from "lucide-react";
import { countWorkingDays, fetchNationalHolidays, fetchNationalHolidaysFromDB } from "@/utils/workingDays";

const LeaveRequestForm = ({
  employees,
  leaveTypes,
  onSubmitSuccess,
  onCancel,
  initialData,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employee_id: "",
    employee_name: "",
    employee_nip: "",
    employee_rank: "",
    employee_position: "",
    employee_department: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    leave_letter_number: "",
    leave_letter_date: "",
    signed_by: "",
    address_during_leave: "",
    leave_quota_year: new Date().getFullYear().toString(), // Default ke tahun berjalan
    application_form_date: new Date().toISOString().split("T")[0], // Default ke hari ini
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [signersData, setSignersData] = useState([]);
  const [isLoadingSigners, setIsLoadingSigners] = useState(false);
  const [signerSearchTerm, setSignerSearchTerm] = useState("");
  const [selectedSigner, setSelectedSigner] = useState(null);
  const [showSignerDropdown, setShowSignerDropdown] = useState(false);
  const [hasNewColumns, setHasNewColumns] = useState(true); // True after migration
  const [holidays, setHolidays] = useState(new Set());
  const [holidaysYear, setHolidaysYear] = useState(new Date().getFullYear());

  const fetchEmployees = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const safeQuery = query.replace(/,/g, '');
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .or(`name.ilike.%${safeQuery}%,nip.ilike.%${safeQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error("Error searching employees:", error);
        toast({
          variant: "destructive",
          title: "Gagal memuat data pegawai",
          description: error.message,
        });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        fetchEmployees(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchEmployees]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (initialData?.employee_id) {
        try {
          // Fetch the latest employee data
          const { data: employee, error } = await supabase
            .from("employees")
            .select("*")
            .eq("id", initialData.employee_id)
            .single();

          if (error) throw error;

          if (employee) {
            setFormData((prev) => ({
              ...prev,
              employee_id: employee.id,
              employee_name: employee.name,
              employee_nip: employee.nip || "",
              employee_rank: employee.rank_group || "",
              employee_position: employee.position_name || "",
              employee_department: employee.department || "",
            }));
            setSearchTerm(employee.name);
          }
        } catch (error) {
          console.error("Error fetching employee data:", error);
          toast({
            variant: "destructive",
            title: "Gagal memuat data pegawai",
            description: error.message,
          });
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          employee_id: "",
          employee_name: "",
          employee_nip: "",
          employee_rank: "",
          employee_position: "",
          employee_department: "",
        }));
        setSearchTerm("");
      }
    };

    if (initialData) {
      // First set all the non-employee related fields
      setFormData((prev) => ({
        ...prev,
        leave_type_id: initialData.leave_type_id || "",
        start_date: initialData.start_date
          ? initialData.start_date.split("T")[0]
          : "",
        end_date: initialData.end_date
          ? initialData.end_date.split("T")[0]
          : "",
        reason: initialData.reason || "",
        leave_letter_number: initialData.leave_letter_number || "",
        leave_letter_date: initialData.leave_letter_date
          ? initialData.leave_letter_date.split("T")[0]
          : "",
        signed_by: initialData.signed_by || "",
        address_during_leave: initialData.address_during_leave || "",
        leave_quota_year:
          initialData.leave_quota_year?.toString() ||
          new Date().getFullYear().toString(),
        application_form_date: initialData.application_form_date
          ? initialData.application_form_date.split("T")[0]
          : new Date().toISOString().split("T")[0],
      }));

      // Then fetch and set employee data
      fetchEmployeeData();
    } else {
      setFormData({
        employee_id: "",
        employee_name: "",
        employee_nip: "",
        employee_rank: "",
        employee_position: "",
        employee_department: "",
        leave_type_id: "",
        start_date: "",
        end_date: "",
        reason: "",
        leave_letter_number: "",
        leave_letter_date: "",
        signed_by: "",
        address_during_leave: "",
        leave_quota_year: new Date().getFullYear().toString(),
        application_form_date: new Date().toISOString().split("T")[0],
      });
      setSearchTerm("");
    }
  }, [initialData]);

  // Fetch data penandatangan saat komponen dimuat
  // Verify migration columns are available
  useEffect(() => {
    const checkDatabaseColumns = async () => {
      try {
        // Verify the new columns work correctly after migration
        const { data, error } = await supabase
          .from("leave_requests")
          .select("leave_quota_year, application_form_date")
          .limit(1);

        if (error) {
          console.error("Migration verification failed:", error);
          setHasNewColumns(false);
          toast({
            variant: "destructive",
            title: "Database Migration Issue",
            description:
              "New columns not available. Please check migration status.",
          });
        } else {
          setHasNewColumns(true);
          console.log("✅ Migration verified - new columns available");
        }
      } catch (error) {
        console.error("Migration check error:", error);
        setHasNewColumns(false);
      }
    };

    checkDatabaseColumns();
  }, [toast]);

  useEffect(() => {
    const fetchSigners = async () => {
      setIsLoadingSigners(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("name, nip, position_name")
          .or(
            "name.ilike.%AGUNG NUR ROHMAD%,name.ilike.%MEMEY MEIRITA HANDAYANI%",
          );

        if (error) throw error;
        setSignersData(data || []);
      } catch (error) {
        console.error("Error fetching signers:", error);
        toast({
          variant: "destructive",
          title: "Gagal Memuat Data Penandatangan",
          description: "Tidak dapat mengambil data dari database.",
        });
      } finally {
        setIsLoadingSigners(false);
      }
    };
    fetchSigners();
  }, [toast]);

  useEffect(() => {
    if (initialData?.signed_by && signersData.length > 0) {
      const signer = signersData.find((s) => s.name === initialData.signed_by);
      if (signer) {
        setSelectedSigner(signer);
        setSignerSearchTerm(signer.name);
      }
    } else if (!initialData) {
      setSelectedSigner(null);
      setSignerSearchTerm("");
    }
  }, [initialData, signersData]);

  const handleSelectEmployee = (employee) => {
    setFormData((prev) => ({
      ...prev,
      employee_id: employee.id,
      employee_name: employee.name,
      employee_nip: employee.nip,
      employee_rank: employee.rank_group || "",
      employee_position: employee.position_name || "",
      employee_department: employee.department || "",
    }));
    setSearchTerm(employee.name);
    setShowDropdown(false);
  };

  const handleClearEmployee = () => {
    setFormData((prev) => ({
      ...prev,
      employee_id: "",
      employee_name: "",
      employee_nip: "",
      employee_rank: "",
      employee_position: "",
      employee_department: "",
    }));
    setSearchTerm("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleSelectSigner = (signer) => {
    setSelectedSigner(signer);
    setSignerSearchTerm(signer.name);
    handleChange("signed_by", signer.name);
    setShowSignerDropdown(false);
  };

  const handleClearSigner = () => {
    setSelectedSigner(null);
    setSignerSearchTerm("");
    handleChange("signed_by", "");
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch holidays from DB when year changes
  useEffect(() => {
    const year = formData.start_date ? new Date(formData.start_date).getFullYear() : new Date().getFullYear();
    setHolidaysYear(year);
    fetchNationalHolidaysFromDB(year)
      .then(setHolidays)
      .catch((err) => {
        console.warn("Gagal mengambil hari libur nasional dari DB:", err.message);
        setHolidays(new Set());
      });
  }, [formData.start_date]);

  const calculateDaysRequested = (start, end) => {
    if (!start || !end) return 0;
    return countWorkingDays(start, end, holidays);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (
      !formData.employee_id ||
      !formData.leave_type_id ||
      !formData.start_date ||
      !formData.end_date
    ) {
      toast({
        variant: "destructive",
        title: "Data Tidak Lengkap",
        description:
          "Pegawai, Jenis Cuti, Tanggal Mulai, dan Tanggal Selesai wajib diisi.",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate quota year (if new columns are available)
    if (hasNewColumns) {
      const currentYear = new Date().getFullYear();
      const quotaYear = parseInt(formData.leave_quota_year);

      if (quotaYear < currentYear - 1) {
        toast({
          variant: "destructive",
          title: "Tahun Jatah Cuti Tidak Valid",
          description:
            "Hanya bisa menggunakan jatah cuti tahun berjalan atau tahun sebelumnya.",
        });
        setIsSubmitting(false);
        return;
      }

      if (quotaYear > currentYear) {
        toast({
          variant: "destructive",
          title: "Tahun Jatah Cuti Tidak Valid",
          description:
            "Tidak bisa menggunakan jatah cuti dari tahun yang akan datang.",
        });
        setIsSubmitting(false);
        return;
      }
    }

    const days_requested = calculateDaysRequested(
      formData.start_date,
      formData.end_date,
    );
    if (days_requested <= 0) {
      toast({
        variant: "destructive",
        title: "Tanggal Tidak Valid",
        description: "Tanggal selesai harus setelah tanggal mulai.",
      });
      setIsSubmitting(false);
      return;
    }

    // Prepare complete data including new fields (after migration)
    const dataToSubmit = {
      ...(initialData?.id ? { id: formData.id } : {}), // Only include id for updates
      employee_id: formData.employee_id,
      leave_type_id: formData.leave_type_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_requested,
      reason: formData.reason || null,
      leave_letter_number: formData.leave_letter_number || null,
      leave_letter_date: formData.leave_letter_date || null,
      signed_by: formData.signed_by || null,
      address_during_leave: formData.address_during_leave || null,
      leave_quota_year:
        parseInt(formData.leave_quota_year) || new Date().getFullYear(),
      application_form_date: formData.application_form_date || null,
      submitted_date: initialData?.id
        ? formData.submitted_date
        : new Date().toISOString(),
    };
    // Convert empty strings to null
    Object.keys(dataToSubmit).forEach((key) => {
      if (dataToSubmit[key] === "") {
        dataToSubmit[key] = null;
      }
    });

    try {
      let error;
      if (initialData?.id) {
        // EDIT MODE: Update existing request and adjust balance
        const { error: updateError } = await supabase
          .from("leave_requests")
          .update(dataToSubmit)
          .eq("id", initialData.id);
        error = updateError;
        if (error) throw error;

        // Adjust balance if key data changed
        const oldDays = initialData.days_requested;
        const newDays = days_requested;
        const oldYear = initialData.leave_quota_year || new Date(initialData.start_date).getFullYear();
        const newYear = dataToSubmit.leave_quota_year || new Date(dataToSubmit.start_date).getFullYear();
        const oldType = initialData.leave_type_id;
        const newType = dataToSubmit.leave_type_id;

        if (oldDays !== newDays || oldYear !== newYear || oldType !== newType) {
          // Revert old balance
          const { error: revertError } = await supabase.rpc("update_leave_balance", {
            p_employee_id: dataToSubmit.employee_id,
            p_leave_type_id: oldType,
            p_year: oldYear,
            p_days: -oldDays,
          });
          if (revertError) console.error("Gagal mengembalikan saldo lama:", revertError.message);

          // Apply new balance
          const { error: applyError } = await supabase.rpc("update_leave_balance", {
            p_employee_id: dataToSubmit.employee_id,
            p_leave_type_id: newType,
            p_year: newYear,
            p_days: newDays,
          });
          if (applyError) console.error("Gagal menerapkan saldo baru:", applyError.message);
        }

      } else {
        // CREATE MODE: Insert new request and update balance
        const { error: insertError } = await supabase
          .from("leave_requests")
          .insert([dataToSubmit]);
        error = insertError;
        if (error) throw error;

        // Gunakan leave_quota_year untuk menentukan tahun saldo cuti yang digunakan
        const quotaYear =
          parseInt(formData.leave_quota_year) ||
          new Date(dataToSubmit.start_date).getFullYear();
        const { error: rpcError } = await supabase.rpc("update_leave_balance", {
          p_employee_id: dataToSubmit.employee_id,
          p_leave_type_id: dataToSubmit.leave_type_id,
          p_year: quotaYear,
          p_days: days_requested,
        });
        if (rpcError)
          console.error(`Gagal memperbarui saldo cuti:`, rpcError.message);
      }

      // Enhanced success message with quota year info
      const quotaYearInfo =
        hasNewColumns && formData.leave_quota_year
          ? ` (Jatah Cuti ${formData.leave_quota_year})`
          : "";

      toast({
        title: `✅ Data Cuti ${initialData?.id ? "Diperbarui" : "Ditambahkan"}`,
        description: `Data cuti berhasil ${initialData?.id ? "diperbarui" : "ditambahkan"}${quotaYearInfo}.`,
      });
      onSubmitSuccess();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast({
        variant: "destructive",
        title: `❌ Gagal ${initialData?.id ? "Memperbarui" : "Menambahkan"} Data`,
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Employee Search */}
          <div
            className="relative"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setShowDropdown(false);
              }
            }}
          >
            <Label htmlFor="employee_search" className="text-slate-300">
              Nama Pegawai
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="employee_search"
                name="employee_search"
                type="text"
                placeholder="Cari nama atau NIP pegawai..."
                className="pl-10 bg-slate-700 border-slate-600 text-white"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
              />
              {formData.employee_id && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={handleClearEmployee}
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>

            {/* Dropdown with search results */}
            {showDropdown && (searchTerm || searchResults.length > 0) && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-slate-400">
                    Mencari...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((employee) => (
                    <div
                      key={employee.id}
                      className="px-4 py-2 cursor-pointer hover:bg-slate-700"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectEmployee(employee);
                      }}
                    >
                      <p className="text-white">{employee.name}</p>
                      <p className="text-sm text-slate-400">{employee.nip}</p>
                    </div>
                  ))
                ) : searchTerm && !isSearching ? (
                  <div className="p-4 text-center text-slate-400">
                    Pegawai tidak ditemukan.
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Employee Details */}
          {formData.employee_id && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 mt-4 bg-slate-800/50 rounded-md border border-slate-700/50">
              <div>
                <Label className="text-xs font-medium text-slate-400">
                  NIP
                </Label>
                <div className="mt-1 text-sm text-white">
                  {formData.employee_nip}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-400">
                  Pangkat/Golongan
                </Label>
                <div className="mt-1 text-sm text-white">
                  {formData.employee_rank}
                </div>
              </div>
              <div className="lg:col-span-1">
                <Label className="text-xs font-medium text-slate-400">
                  Jabatan
                </Label>
                <div className="mt-1 text-sm text-white">
                  {formData.employee_position}
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <Label className="text-xs font-medium text-slate-400">
                  Unit Penempatan
                </Label>
                <div className="mt-1 text-sm text-white">
                  {formData.employee_department}
                </div>
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="leave_type_id" className="text-slate-300">
              Jenis Cuti
            </Label>
            <Select
              value={formData.leave_type_id}
              onValueChange={(value) => handleChange("leave_type_id", value)}
              required
            >
              <SelectTrigger
                id="leave_type_id"
                className="bg-slate-700 border-slate-600 text-white"
              >
                <SelectValue placeholder="Pilih jenis cuti" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {leaveTypes.map((type) => (
                  <SelectItem
                    key={type.id}
                    value={type.id}
                    className="text-white hover:bg-slate-600"
                  >
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start_date" className="text-slate-300">
              Tanggal Mulai
            </Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          <div>
            <Label htmlFor="end_date" className="text-slate-300">
              Tanggal Selesai
            </Label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => handleChange("end_date", e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
        </div>

        {/* New fields - only show if database columns exist */}
        {hasNewColumns && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="leave_quota_year" className="text-slate-300">
                Jatah Cuti Tahun
                <span className="text-xs text-slate-400 block">
                  (Tahun jatah cuti yang digunakan)
                </span>
              </Label>
              <Select
                value={formData.leave_quota_year}
                onValueChange={(value) =>
                  handleChange("leave_quota_year", value)
                }
                required
              >
                <SelectTrigger
                  id="leave_quota_year"
                  className="bg-slate-700 border-slate-600 text-white"
                >
                  <SelectValue placeholder="Pilih tahun jatah cuti" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {/* Tahun berjalan dan tahun sebelumnya */}
                  <SelectItem
                    value={new Date().getFullYear().toString()}
                    className="text-white hover:bg-slate-600"
                  >
                    {new Date().getFullYear()} (Tahun Berjalan)
                  </SelectItem>
                  <SelectItem
                    value={(new Date().getFullYear() - 1).toString()}
                    className="text-white hover:bg-slate-600"
                  >
                    {new Date().getFullYear() - 1} (Penangguhan)
                  </SelectItem>
                </SelectContent>
              </Select>
              {formData.leave_quota_year && (
                <div className="mt-2 p-2 rounded border">
                  {parseInt(formData.leave_quota_year) <
                  new Date().getFullYear() ? (
                    <div className="text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
                      ⚠️ <strong>Saldo Cuti Penangguhan</strong>
                      <br />
                      Menggunakan saldo cuti yang ditangguhkan dari tahun{" "}
                      {formData.leave_quota_year}. Pastikan pegawai memiliki
                      saldo penangguhan yang cukup.
                    </div>
                  ) : (
                    <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded">
                      ✓ <strong>Saldo Cuti Tahun Berjalan</strong>
                      <br />
                      Menggunakan saldo cuti normal tahun{" "}
                      {formData.leave_quota_year}.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="application_form_date" className="text-slate-300">
                Tanggal Formulir Pengajuan Cuti
                <span className="text-xs text-slate-400 block">
                  (Tanggal pengajuan formulir cuti)
                </span>
              </Label>
              <Input
                id="application_form_date"
                name="application_form_date"
                type="date"
                value={formData.application_form_date}
                onChange={(e) =>
                  handleChange("application_form_date", e.target.value)
                }
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>
        )}

        {/* Database migration notice */}
        {!hasNewColumns && (
          <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="text-sm">
                <p className="text-blue-200 font-medium mb-1">
                  Fitur Baru Tersedia
                </p>
                <p className="text-blue-300 text-xs">
                  Fitur "Jatah Cuti Tahun" dan "Tanggal Formulir" tersedia
                  setelah database migration. Hubungi administrator untuk
                  mengaktifkan fitur ini.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="leave_letter_number" className="text-slate-300">
              No. Surat Cuti
            </Label>
            <Input
              id="leave_letter_number"
              name="leave_letter_number"
              placeholder="Nomor surat cuti yang diterbitkan"
              value={formData.leave_letter_number}
              onChange={(e) =>
                handleChange("leave_letter_number", e.target.value)
              }
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="leave_letter_date" className="text-slate-300">
              Tanggal Surat
            </Label>
            <Input
              id="leave_letter_date"
              name="leave_letter_date"
              type="date"
              value={formData.leave_letter_date}
              onChange={(e) =>
                handleChange("leave_letter_date", e.target.value)
              }
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="signer_search" className="text-slate-300">
              Pejabat yang Menandatangani
            </Label>
            <div
              className="relative mt-1"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setShowSignerDropdown(false);
                }
              }}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="signer_search"
                name="signer_search"
                type="text"
                placeholder={isLoadingSigners ? "Memuat..." : "Cari pejabat..."}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
                value={signerSearchTerm}
                onChange={(e) => {
                  setSignerSearchTerm(e.target.value);
                  setShowSignerDropdown(true);
                }}
                onFocus={() => setShowSignerDropdown(true)}
                autoComplete="off"
                disabled={isLoadingSigners}
              />
              {selectedSigner && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={handleClearSigner}
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-white" />
                </button>
              )}
              {showSignerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {isLoadingSigners ? (
                    <div className="p-4 text-center text-slate-400">
                      Memuat...
                    </div>
                  ) : signersData.filter((s) =>
                      s.name
                        .toLowerCase()
                        .includes(signerSearchTerm.toLowerCase()),
                    ).length > 0 ? (
                    signersData
                      .filter((s) =>
                        s.name
                          .toLowerCase()
                          .includes(signerSearchTerm.toLowerCase()),
                      )
                      .map((signer) => (
                        <div
                          key={signer.nip}
                          className="px-4 py-2 cursor-pointer hover:bg-slate-700"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSigner(signer);
                          }}
                        >
                          <p className="text-white">{signer.name}</p>
                          <p className="text-sm text-slate-400">
                            {signer.position_name}
                          </p>
                        </div>
                      ))
                  ) : (
                    <div className="p-4 text-center text-slate-400">
                      Pejabat tidak ditemukan.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Signer Details Box */}
        {selectedSigner && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-800/50 rounded-md border border-slate-700/50">
            <div>
              <Label className="text-xs font-medium text-slate-400">NIP</Label>
              <div className="mt-1 text-sm text-white">
                {selectedSigner.nip}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-400">
                Jabatan
              </Label>
              <div className="mt-1 text-sm text-white">
                {selectedSigner.position_name}
              </div>
            </div>
          </div>
        )}

        <div className="md:col-span-2">
          <Label htmlFor="address_during_leave" className="text-slate-300">
            Alamat Selama Cuti
          </Label>
          <Textarea
            id="address_during_leave"
            placeholder="Alamat lengkap selama menjalankan cuti"
            value={formData.address_during_leave}
            onChange={(e) =>
              handleChange("address_during_leave", e.target.value)
            }
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
        <div>
          <Label htmlFor="reason" className="text-slate-300">
            Alasan/Keterangan
          </Label>
          <Textarea
            id="reason"
            placeholder="Masukkan alasan atau keterangan cuti"
            value={formData.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-slate-300 hover:text-white"
          >
            Batal
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting
              ? initialData?.id
                ? "Memperbarui..."
                : "Menyimpan..."
              : initialData?.id
                ? "Simpan Perubahan"
                : "Simpan Data Cuti"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default LeaveRequestForm;
