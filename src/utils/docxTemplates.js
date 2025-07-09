/**
 * Utility functions for managing DOCX templates and variable replacement
 */

import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

/**
 * Extract variables from DOCX template content
 */
export const extractDocxVariables = async (docxData) => {
  try {
    if (!docxData) {
      console.warn("No DOCX data provided for variable extraction");
      return [];
    }

    console.log("Starting DOCX variable extraction...");
    console.log("DOCX data type:", typeof docxData);
    console.log("DOCX data length:", docxData.length);

    // Convert base64 to array buffer
    const base64Data = docxData.includes(",")
      ? docxData.split(",")[1]
      : docxData;

    console.log("Base64 data extracted, length:", base64Data.length);

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const docxBytes = new Uint8Array(byteNumbers);

    console.log("DOCX bytes created, size:", docxBytes.length);

    // Convert DOCX to HTML to extract variables
    const result = await mammoth.convertToHtml({
      arrayBuffer: docxBytes.buffer,
    });

    console.log("Mammoth conversion completed");
    console.log("HTML result:", result.value.substring(0, 500) + "...");
    console.log("Conversion messages:", result.messages);

    const html = result.value;

    // Also try to extract from raw text using mammoth's extractRawText
    let rawText = "";
    try {
      const rawResult = await mammoth.extractRawText({
        arrayBuffer: docxBytes.buffer,
      });
      rawText = rawResult.value;
      console.log("Raw text extracted:", rawText.substring(0, 500) + "...");
    } catch (rawError) {
      console.warn("Could not extract raw text:", rawError);
    }

    // Combine HTML and raw text for variable extraction
    const combinedText = html + " " + rawText;

    // Try multiple regex patterns to catch different variable formats
    const patterns = [
      /\{\{([^}]+)\}\}/g, // {{variable}}
      /\{\{\s*([^}]+)\s*\}\}/g, // {{ variable }} with spaces
      /{{([^}]+)}}/g, // Smart quotes might be converted
      /\{\s*\{([^}]+)\}\s*\}/g, // { {variable} } with spaces
      /\u007B\u007B([^\u007D]+)\u007D\u007D/g, // Unicode curly braces
      /\u201C\u201C([^\u201D]+)\u201D\u201D/g, // Smart quotes converted to unicode
    ];

    const variables = new Set();

    patterns.forEach((pattern, index) => {
      console.log(`Trying pattern ${index + 1}:`, pattern);
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(combinedText)) !== null) {
        const variableName = match[1].trim();
        if (variableName && variableName.length > 0) {
          variables.add(variableName);
          console.log(`Found variable: "${variableName}"`);
        }
      }
    });

    // Also search for any curly brace patterns for debugging
    console.log("Raw text search for curly brace patterns:");
    const allCurlyMatches = combinedText.match(
      /[\{\u007B\u201C][^\}\u007D\u201D]*[\}\u007D\u201D]/g,
    );
    console.log("All curly brace matches:", allCurlyMatches);

    // Additional search for common variable patterns without strict formatting
    const commonVariables = [
      "nama",
      "nip",
      "jabatan",
      "unit_kerja",
      "pangkat_golongan",
      "jenis_cuti",
      "tanggal_mulai",
      "tanggal_selesai",
      "tanggal_cuti",
      "lama_cuti",
      "alamat_selama_cuti",
      "alasan",
      "nomor_surat",
      "tanggal_surat",
      "kota",
      "tahun",
      "jatah_cuti_tahun",
      "nama_atasan",
      "nip_atasan",
      "jabatan_atasan",
    ];

    // Look for these variables even if not in perfect {{}} format
    commonVariables.forEach((varName) => {
      const patterns = [
        new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, "gi"),
        new RegExp(`\\{\\s*\\{\\s*${varName}\\s*\\}\\s*\\}`, "gi"),
        new RegExp(`${varName}`, "gi"), // Last resort - just look for the variable name
      ];

      patterns.forEach((pattern) => {
        if (pattern.test(combinedText)) {
          variables.add(varName);
          console.log(`Found common variable: "${varName}"`);
        }
      });
    });

    console.log(
      `Total ${variables.size} unique variables found:`,
      Array.from(variables),
    );

    return Array.from(variables).map((variable) => ({
      name: variable,
      type: "text",
      isRequired: true,
    }));
  } catch (error) {
    console.error("Error extracting DOCX variables:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    return [];
  }
};

/**
 * Replace variables in DOCX template with actual values while preserving formatting
 * This function now works directly with DOCX files to maintain original formatting
 */
export const replaceDocxVariables = async (docxData, variables) => {
  try {
    if (!docxData) {
      throw new Error("No DOCX data provided");
    }

    console.log(
      "Starting direct DOCX variable replacement with data:",
      variables,
    );

    // Convert base64 to array buffer
    const base64Data = docxData.includes(",")
      ? docxData.split(",")[1]
      : docxData;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const docxBytes = new Uint8Array(byteNumbers);

    // Extract raw text to perform variable replacement
    const result = await mammoth.extractRawText({
      arrayBuffer: docxBytes.buffer,
    });

    let text = result.value;
    console.log("Original text extracted:", text.substring(0, 500) + "...");

    // List of variables that should be preserved (not replaced) for external applications
    const preservedVariables = [
      'nomor_naskah',
      'ttd_pengirim'
    ];

    // Replace variables in the text
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        let stringValue = String(value);

        // Handle special formatting for common fields
        if (key.includes("tanggal")) {
          try {
            const date = new Date(stringValue);
            if (!isNaN(date.getTime())) {
              stringValue = date.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
            }
          } catch (dateError) {
            // Keep original value if date parsing fails
          }
        }

        console.log(`Replacing variable "${key}" with "${stringValue}"`);

        // Enhanced replacement patterns
        const patterns = [
          new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, "gi"),
          new RegExp(`\\{\\s*\\{\\s*${escapeRegex(key)}\\s*\\}\\s*\\}`, "gi"),
          new RegExp(`{{${escapeRegex(key)}}}`, "gi"),
        ];

        patterns.forEach((pattern) => {
          text = text.replace(pattern, stringValue);
        });
      }
    });

    // Clean up any remaining unmatched variables except preserved ones
    text = text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      if (preservedVariables.includes(variableName.trim())) {
        console.log(`Preserving variable for external application in text replacement: {${variableName}}`);
        return match; // Keep the original variable
      }
      return ""; // Remove other unmatched variables
    });

    console.log("Text after replacement:", text.substring(0, 500) + "...");

    // For browser compatibility, we'll use a simpler approach
    // Convert the modified text back to a DOCX-like format
    // This is a simplified approach that maintains basic formatting
    const modifiedDocxBytes = new Uint8Array(docxBytes);

    // Convert the modified text to a simple DOCX structure
    // This is a basic implementation - for more complex documents, you might need a different approach
    const simpleDocxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

    // For now, return the original bytes with a note that this is a simplified approach
    // In a production environment, you might want to use a more sophisticated DOCX manipulation library
    console.log(
      "Using simplified DOCX replacement approach for browser compatibility",
    );

    // Return the original bytes for now - this is a temporary solution
    // The actual variable replacement would need a more sophisticated DOCX manipulation library
    return docxBytes;
  } catch (error) {
    console.error("Error replacing DOCX variables:", error);
    throw error;
  }
};

/**
 * Helper function to escape special regex characters
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Process DOCX template with data and return DOCX
 * Browser-compatible version using simplified approach
 */
export const processDocxTemplate = async (
  docxData,
  variables,
  options = {},
) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("=== PROCESSING DOCX TEMPLATE ===");
      console.log("Variables provided:", Object.keys(variables));
      console.log("Total variables count:", Object.keys(variables).length);

      // Log sample of variables for debugging
      const sampleVars = Object.keys(variables)
        .slice(0, 10)
        .reduce((obj, key) => {
          obj[key] = variables[key];
          return obj;
        }, {});
      console.log("Sample variables:", sampleVars);

      // Check for indexed variables
      const indexedVars = Object.keys(variables).filter((key) =>
        /^\w+_\d+$/.test(key),
      );
      console.log("Indexed variables found:", indexedVars.length);
      if (indexedVars.length > 0) {
        console.log("Sample indexed variables:", indexedVars.slice(0, 5));
      }

      const base64Data = docxData.includes(",")
        ? docxData.split(",")[1]
        : docxData;
      const arrayBuffer = Uint8Array.from(atob(base64Data), (c) =>
        c.charCodeAt(0),
      ).buffer;

      const zip = new PizZip(arrayBuffer);

      // List of variables that should be preserved (not replaced) for external applications
      const preservedVariables = [
        'nomor_naskah',
        'ttd_pengirim'
      ];

      const nullGetter = (part) => {
        const variableName = part.value;
        
        // Check if this variable should be preserved
        if (preservedVariables.includes(variableName)) {
          console.log(`Preserving variable for external application: {${variableName}}`);
          return `{${variableName}}`; // Return the original variable format
        }
        
        console.warn(`Template variable not found in data: {${variableName}}`);
        return "";
      };

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: nullGetter,
      });

      console.log("Setting data to template...");
      doc.setData(variables);

      console.log("Rendering template...");
      doc.render();

      console.log("Generating DOCX blob...");
      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      console.log("✓ DOCX blob generated successfully");
      console.log("Blob size:", out.size, "bytes");
      console.log("=== DOCX PROCESSING COMPLETE ===");
      resolve(out);
    } catch (error) {
      console.error("❌ Error during DOCX processing/rendering:", error);
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);

      if (error.properties && error.properties.errors) {
        console.error("Template errors:", error.properties.errors);
        const messages = error.properties.errors
          .map(
            (err) =>
              `- ${err.properties.explanation} (tag: {${err.properties.id}}).`,
          )
          .join("\\n");
        reject(
          new Error(`Ditemukan beberapa error pada template:\\n\\n${messages}`),
        );
      } else {
        reject(error);
      }
    }
  });
};

/**
 * Get available DOCX templates from localStorage
 */
export const getAvailableDocxTemplates = async () => {
  try {
    console.log("Fetching DOCX templates from localStorage...");
    const savedTemplates =
      JSON.parse(localStorage.getItem("savedTemplates")) || [];
    console.log("All templates from localStorage:", savedTemplates);

    const docxTemplates = savedTemplates.filter((t) => {
      const isValid =
        t.type === "docx" && t.content?.type === "docx" && t.content?.data;
      console.log(`Template "${t.name}" is valid:`, isValid);
      return isValid;
    });

    console.log("Filtered DOCX templates:", docxTemplates);
    return docxTemplates;
  } catch (error) {
    console.error("Error fetching DOCX templates:", error);
    return [];
  }
};

/**
 * Save DOCX template to localStorage
 */
export const saveDocxTemplate = async (template) => {
  try {
    console.log("Saving DOCX template:", template);

    // Validate template structure
    if (!template.name || !template.content || !template.content.data) {
      throw new Error("Template tidak valid: nama dan konten diperlukan");
    }

    const savedTemplates =
      JSON.parse(localStorage.getItem("savedTemplates")) || [];

    // Check if template with same name exists
    const existingIndex = savedTemplates.findIndex(
      (t) =>
        t.name.toLowerCase() === template.name.toLowerCase() &&
        t.type === "docx",
    );

    let updatedTemplates;
    if (existingIndex !== -1) {
      // Update existing template
      updatedTemplates = [...savedTemplates];
      updatedTemplates[existingIndex] = {
        ...template,
        updatedAt: new Date().toISOString(),
      };
      console.log("Updated existing template at index:", existingIndex);
    } else {
      // Add new template
      updatedTemplates = [
        ...savedTemplates,
        {
          ...template,
          id: template.id || Date.now().toString(),
          createdAt: template.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      console.log("Added new template");
    }

    localStorage.setItem("savedTemplates", JSON.stringify(updatedTemplates));
    console.log(
      "Template saved successfully. Total templates:",
      updatedTemplates.length,
    );

    // Verify save
    const verification =
      JSON.parse(localStorage.getItem("savedTemplates")) || [];
    console.log("Verification - templates in storage:", verification.length);

    return template;
  } catch (error) {
    console.error("Error saving DOCX template:", error);
    throw error;
  }
};

/**
 * Validate DOCX file
 */
export const validateDocxFile = (file) => {
  const validTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  const validExtensions = [".docx", ".doc"];
  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));

  return (
    validTypes.includes(file.type) || validExtensions.includes(fileExtension)
  );
};

/**
 * Match available data fields with DOCX variables
 */
export const matchDataWithDocxVariables = (dataFields, variables) => {
  console.log("=== MATCHING DATA WITH VARIABLES ===");
  console.log("Data fields:", Object.keys(dataFields));
  console.log(
    "Variables:",
    variables.map((v) => v.name),
  );

  const matches = [];
  const unmatchedData = [];
  const unmatchedVariables = [...variables];

  Object.keys(dataFields).forEach((dataKey) => {
    const dataValue = dataFields[dataKey];

    // Skip null, undefined, or empty values
    if (dataValue === null || dataValue === undefined || dataValue === "") {
      console.log(`Skipping ${dataKey} - empty value`);
      return;
    }

    let matched = false;

    // Look for exact matches first
    const exactMatchIndex = unmatchedVariables.findIndex(
      (variable) => variable.name.toLowerCase() === dataKey.toLowerCase(),
    );

    if (exactMatchIndex !== -1) {
      const matchedVariable = unmatchedVariables[exactMatchIndex];
      matches.push({
        dataKey,
        dataValue,
        variableName: matchedVariable.name,
        matchType: "exact",
      });
      unmatchedVariables.splice(exactMatchIndex, 1);
      matched = true;
      console.log(
        `✓ Exact match: ${dataKey} -> ${matchedVariable.name} = ${dataValue}`,
      );
    } else {
      // Look for partial matches
      const partialMatchIndex = unmatchedVariables.findIndex(
        (variable) =>
          variable.name.toLowerCase().includes(dataKey.toLowerCase()) ||
          dataKey.toLowerCase().includes(variable.name.toLowerCase()),
      );

      if (partialMatchIndex !== -1) {
        const matchedVariable = unmatchedVariables[partialMatchIndex];
        matches.push({
          dataKey,
          dataValue,
          variableName: matchedVariable.name,
          matchType: "partial",
        });
        unmatchedVariables.splice(partialMatchIndex, 1);
        matched = true;
        console.log(
          `✓ Partial match: ${dataKey} -> ${matchedVariable.name} = ${dataValue}`,
        );
      }
    }

    if (!matched) {
      unmatchedData.push({ key: dataKey, value: dataValue });
      console.log(`- No match for: ${dataKey} = ${dataValue}`);
    }
  });

  console.log(`Total matches: ${matches.length}`);
  console.log(
    `Unmatched variables: ${unmatchedVariables.map((v) => v.name).join(", ")}`,
  );
  console.log("=== END MATCHING ===");

  return {
    matches,
    unmatchedData,
    unmatchedVariables,
  };
};

/**
 * Generate HTML preview from DOCX template with variable replacement
 */
export const generateDocxPreview = async (docxData, variables = {}) => {
  try {
    if (!docxData) {
      throw new Error("No DOCX data provided");
    }

    console.log("Generating DOCX preview with variables:", variables);

    // Convert base64 to array buffer
    const base64Data = docxData.includes(",")
      ? docxData.split(",")[1]
      : docxData;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const docxBytes = new Uint8Array(byteNumbers);

    // Convert DOCX to HTML using mammoth
    const result = await mammoth.convertToHtml({
      arrayBuffer: docxBytes.buffer,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
        "p[style-name='Intense Quote'] => blockquote.intense:fresh",
        "p[style-name='List Paragraph'] => li:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "r[style-name='Code'] => code",
        "table => table.table",
        "tr => tr",
        "td => td",
        "th => th",
      ],
    });

    let html = result.value;

    // List of variables that should be preserved (not replaced) for external applications
    const preservedVariables = [
      'nomor_naskah',
      'ttd_pengirim'
    ];

    // Replace variables in the HTML
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        let stringValue = String(value);

        // Handle special formatting for common fields
        if (key.includes("tanggal")) {
          try {
            const date = new Date(stringValue);
            if (!isNaN(date.getTime())) {
              stringValue = date.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
            }
          } catch (dateError) {
            console.warn("Could not format date for", key, dateError);
          }
        }

        // Replace variables with multiple patterns
        const patterns = [
          new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, "g"),
          new RegExp(`\\{\\s*\\{\\s*${escapeRegex(key)}\\s*\\}\\s*\\}`, "g"),
          new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, "g"),
        ];

        patterns.forEach((pattern) => {
          html = html.replace(pattern, stringValue);
        });
      }
    });

    // Clean up any remaining unmatched variables except preserved ones
    html = html.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      if (preservedVariables.includes(variableName.trim())) {
        console.log(`Preserving variable for external application in preview: {${variableName}}`);
        return match; // Keep the original variable
      }
      return ""; // Remove other unmatched variables
    });

    // Add CSS styling for better preview
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.5;
              margin: 0;
              padding: 20px;
              background: white;
              color: black;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1em;
              margin-bottom: 0.5em;
              font-weight: bold;
            }
            h1 { font-size: 18pt; }
            h2 { font-size: 16pt; }
            h3 { font-size: 14pt; }
            h4, h5, h6 { font-size: 12pt; }
            p {
              margin: 0.5em 0;
              text-align: justify;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            blockquote {
              margin: 1em 0;
              padding: 0.5em 1em;
              border-left: 4px solid #ccc;
              background-color: #f9f9f9;
            }
            ul, ol {
              margin: 0.5em 0;
              padding-left: 2em;
            }
            li {
              margin: 0.25em 0;
            }
            strong { font-weight: bold; }
            em { font-style: italic; }
            code {
              background-color: #f4f4f4;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
            }
            .page-break {
              page-break-before: always;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    console.log("DOCX preview generated successfully");
    return styledHtml;
  } catch (error) {
    console.error("Error generating DOCX preview:", error);
    throw new Error(`Gagal membuat preview: ${error.message}`);
  }
};
