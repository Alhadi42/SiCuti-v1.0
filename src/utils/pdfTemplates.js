/**
 * Utility functions for managing PDF templates and form fields
 */

/**
 * Get the form field mapping for a specific template
 * This maps your database fields to PDF form field names
 */
export const getTemplateFieldMapping = (templateId) => {
  // This is an example mapping - you'll need to adjust based on your actual PDF form field names
  const fieldMappings = {
    // Example template with common fields
    surat_keterangan: {
      // Employee Information
      nama: "Nama",
      nip: "NIP",
      jabatan: "Jabatan",
      unit_kerja: "UnitKerja",

      // Leave Information
      jenis_cuti: "JenisCuti",
      alasan: "AlasanCuti",
      lama_cuti: "LamaCuti",
      tanggal_mulai: "TanggalMulai",
      tanggal_selesai: "TanggalSelesai",
      tanggal_formulir_pengajuan: "TanggalFormulirPengajuan",
      alamat_selama_cuti: "AlamatCuti",

      // Approval Information
      tanggal_surat: "TanggalSurat",
      nomor_surat: "NomorSurat",
      pejabat_berwenang: "PejabatBerwenang",
      jabatan_pejabat: "JabatanPejabat",
      nip_pejabat: "NIPPejabat",
    },

    // Add more template mappings as needed
  };

  return fieldMappings[templateId] || {};
};

/**
 * Format form data according to the template's field mapping
 */
export const formatFormDataForPdf = (data, templateId) => {
  const fieldMapping = getTemplateFieldMapping(templateId);
  const formattedData = {};

  // Map data fields to PDF form fields
  Object.entries(fieldMapping).forEach(([dataField, pdfField]) => {
    if (data[dataField] !== undefined) {
      formattedData[pdfField] = data[dataField];
    }
  });

  return formattedData;
};

/**
 * Get the URL for a template by its ID
 */
export const getTemplateUrl = (templateId) => {
  // In a real app, this would fetch from your API
  const templateUrls = {
    surat_keterangan: "/templates/surat_keterangan.pdf",
    // Add more template URLs as needed
  };

  return templateUrls[templateId] || "/templates/default.pdf";
};

/**
 * Get a list of available templates from localStorage
 */
export const getAvailableTemplates = async () => {
  try {
    const savedTemplates =
      JSON.parse(localStorage.getItem("savedTemplates")) || [];
    return savedTemplates.filter(
      (t) => t.type === "pdf" && t.content?.type === "pdf",
    );
  } catch (error) {
    console.error("Error fetching templates:", error);
    return [];
  }
};

/**
 * Extract form fields from a PDF template
 */
export const extractPdfFormFields = async (pdfData) => {
  try {
    const { PDFDocument } = await import("pdf-lib");

    if (!pdfData) {
      console.warn("No PDF data provided for form field extraction");
      return [];
    }

    // Convert base64 to array buffer
    const base64Data = pdfData.includes(",") ? pdfData.split(",")[1] : pdfData;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const pdfBytes = new Uint8Array(byteNumbers);

    // Load PDF and get form fields
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`Found ${fields.length} form fields in PDF template`);

    return fields.map((field) => {
      const fieldInfo = {
        name: field.getName(),
        type: field.constructor.name.replace("PDF", ""),
        isRequired: false, // PDF-lib doesn't provide this info easily
      };

      // Try to get additional field information
      try {
        if (field.constructor.name === "PDFTextField") {
          fieldInfo.maxLength = field.getMaxLength();
          fieldInfo.defaultValue = field.getText();
        } else if (field.constructor.name === "PDFCheckBox") {
          fieldInfo.isChecked = field.isChecked();
        } else if (field.constructor.name === "PDFDropdown") {
          fieldInfo.options = field.getOptions();
          fieldInfo.selectedValue = field.getSelected();
        }
      } catch (e) {
        // Some field properties might not be accessible
      }

      return fieldInfo;
    });
  } catch (error) {
    console.error("Error extracting PDF form fields:", error);
    return [];
  }
};

/**
 * Save template to localStorage with Supabase backup option
 */
export const saveTemplate = async (template, useSupabase = false) => {
  try {
    // Save to localStorage
    const savedTemplates =
      JSON.parse(localStorage.getItem("savedTemplates")) || [];
    const updatedTemplates = [...savedTemplates, template];
    localStorage.setItem("savedTemplates", JSON.stringify(updatedTemplates));

    // TODO: Optionally save to Supabase for cloud storage
    if (useSupabase) {
      // Implementation for Supabase storage
      console.log("Supabase storage not implemented yet");
    }

    return template;
  } catch (error) {
    console.error("Error saving template:", error);
    throw error;
  }
};

/**
 * Get template fields for a specific template
 * This helps with generating forms to collect the necessary data
 */
export const getTemplateFields = (templateId) => {
  // Define the fields needed for each template
  const templateFields = {
    surat_keterangan: [
      { name: "nama", label: "Nama Lengkap", type: "text", required: true },
      { name: "nip", label: "NIP", type: "text", required: true },
      { name: "jabatan", label: "Jabatan", type: "text", required: true },
      { name: "unit_kerja", label: "Unit Kerja", type: "text", required: true },
      {
        name: "jenis_cuti",
        label: "Jenis Cuti",
        type: "select",
        options: [
          "Cuti Tahunan",
          "Cuti Sakit",
          "Cuti Besar",
          "Cuti Melahirkan",
          "Cuti Karena Alasan Penting",
          "Cuti di Luar Tanggungan Negara",
        ],
        required: true,
      },
      {
        name: "alasan",
        label: "Alasan Cuti",
        type: "textarea",
        required: true,
      },
      {
        name: "lama_cuti",
        label: "Lama Cuti (hari)",
        type: "number",
        required: true,
      },
      {
        name: "tanggal_mulai",
        label: "Tanggal Mulai",
        type: "date",
        required: true,
      },
      {
        name: "tanggal_selesai",
        label: "Tanggal Selesai",
        type: "date",
        required: true,
      },
      {
        name: "tanggal_formulir_pengajuan",
        label: "Tanggal Formulir Pengajuan",
        type: "date",
        required: false,
      },
      {
        name: "alamat_selama_cuti",
        label: "Alamat Selama Cuti",
        type: "textarea",
        required: true,
      },
      {
        name: "nomor_surat",
        label: "Nomor Surat",
        type: "text",
        required: true,
      },
      {
        name: "tanggal_surat",
        label: "Tanggal Surat",
        type: "date",
        required: true,
      },
    ],
    // Add more template field definitions as needed
  };

  return templateFields[templateId] || [];
};

/**
 * Match available data fields with PDF form fields
 */
export const matchDataWithFormFields = (dataFields, formFields) => {
  const matches = [];
  const unmatchedData = [];
  const unmatchedFields = [...formFields];

  Object.keys(dataFields).forEach((dataKey) => {
    const dataValue = dataFields[dataKey];
    let matched = false;

    // Create variations of the data key to match against form field names
    const variations = [
      dataKey,
      dataKey.toLowerCase(),
      dataKey.toUpperCase(),
      dataKey.replace(/_/g, " "),
      dataKey.replace(/_/g, ""),
      dataKey.replace(/_/g, "-"),
      dataKey.charAt(0).toUpperCase() + dataKey.slice(1),
      dataKey
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(""),
      dataKey
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    ];

    // Try to find a matching form field
    for (const variation of variations) {
      const fieldIndex = unmatchedFields.findIndex(
        (field) =>
          field.name.toLowerCase() === variation.toLowerCase() ||
          field.name.replace(/[\s_-]/g, "").toLowerCase() ===
            variation.replace(/[\s_-]/g, "").toLowerCase(),
      );

      if (fieldIndex !== -1) {
        const matchedField = unmatchedFields[fieldIndex];
        matches.push({
          dataKey,
          dataValue,
          fieldName: matchedField.name,
          fieldType: matchedField.type,
          matchedBy: variation,
        });
        unmatchedFields.splice(fieldIndex, 1);
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatchedData.push({ key: dataKey, value: dataValue });
    }
  });

  return {
    matches,
    unmatchedData,
    unmatchedFields,
  };
};

/**
 * Generate suggestions for unmatched fields
 */
export const generateFieldSuggestions = (unmatchedData, unmatchedFields) => {
  const suggestions = [];

  unmatchedData.forEach((data) => {
    const bestMatches = unmatchedFields
      .map((field) => {
        const similarity = calculateStringSimilarity(data.key, field.name);
        return { field, similarity };
      })
      .filter((match) => match.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    if (bestMatches.length > 0) {
      suggestions.push({
        dataKey: data.key,
        suggestions: bestMatches.map((match) => ({
          fieldName: match.field.name,
          fieldType: match.field.type,
          similarity: match.similarity,
        })),
      });
    }
  });

  return suggestions;
};

/**
 * Calculate string similarity (simple Levenshtein-based)
 */
function calculateStringSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().replace(/[\s_-]/g, "");
  const s2 = str2.toLowerCase().replace(/[\s_-]/g, "");

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  return (maxLength - matrix[s2.length][s1.length]) / maxLength;
}
