import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Generate leave proposal letter document
 */
export const generateLeaveProposalLetter = async (proposalData) => {
  try {
    console.log("Generating leave proposal letter for:", proposalData);

    const { 
      proposal, 
      proposalItems, 
      organization = {
        name: "PEMERINTAH KABUPATEN/KOTA",
        department: "DINAS/BADAN",
        address: "Jl. Alamat Kantor No. 123",
        city: "Kota, Kode Pos 12345",
        phone: "Telp. (021) 1234567",
        email: "email@domain.com"
      }
    } = proposalData;

    // Create document
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "header",
            name: "Header",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 24,
              bold: true,
            },
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 200,
              },
            },
          },
          {
            id: "subheader",
            name: "Subheader",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 22,
              bold: true,
            },
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 200,
              },
            },
          },
          {
            id: "normal",
            name: "Normal",
            run: {
              size: 22,
            },
            paragraph: {
              spacing: {
                line: 276,
                after: 120,
              },
            },
          },
        ],
      },
      sections: [
        {
          properties: {},
          children: [
            // Header
            new Paragraph({
              style: "header",
              children: [
                new TextRun({
                  text: organization.name.toUpperCase(),
                  bold: true,
                }),
              ],
            }),

            new Paragraph({
              style: "subheader",
              children: [
                new TextRun({
                  text: organization.department.toUpperCase(),
                  bold: true,
                }),
              ],
            }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: organization.address,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${organization.city} | ${organization.phone} | ${organization.email}`,
                  size: 20,
                }),
              ],
              spacing: { after: 300 },
            }),

            // Divider line
            new Paragraph({
              children: [
                new TextRun({
                  text: "���".repeat(80),
                  size: 16,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
            }),

            // Letter details
            new Paragraph({
              children: [
                new TextRun({
                  text: `Nomor\t\t: ${proposal.letter_number || ""}`,
                  size: 22,
                }),
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Tanggal\t\t: ${proposal.letter_date ? format(new Date(proposal.letter_date), "dd MMMM yyyy", { locale: id }) : format(new Date(), "dd MMMM yyyy", { locale: id })}`,
                  size: 22,
                }),
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Perihal\t\t: ${proposal.proposal_title}`,
                  size: 22,
                  bold: true,
                }),
              ],
              spacing: { after: 300 },
            }),

            // Recipient
            new Paragraph({
              children: [
                new TextRun({
                  text: "Kepada",
                  size: 22,
                }),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Yth. Kepala Bagian Kepegawaian",
                  size: 22,
                }),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "di Tempat",
                  size: 22,
                }),
              ],
              spacing: { after: 300 },
            }),

            // Letter content
            new Paragraph({
              children: [
                new TextRun({
                  text: "Dengan hormat,",
                  size: 22,
                }),
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Sehubungan dengan usulan cuti yang diajukan oleh ${proposal.proposer_unit}, bersama ini kami sampaikan daftar pegawai yang akan mengambil cuti sebagai berikut:`,
                  size: 22,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Employee table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                // Header row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "No",
                              bold: true,
                              size: 20,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 8, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Nama Pegawai",
                              bold: true,
                              size: 20,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "NIP",
                              bold: true,
                              size: 20,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Jabatan",
                              bold: true,
                              size: 20,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Jenis Cuti",
                              bold: true,
                              size: 20,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Periode Cuti",
                              bold: true,
                              size: 20,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 12, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                // Data rows
                ...proposalItems.map((item, index) => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: (index + 1).toString(),
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: item.employee_name,
                                size: 20,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: item.employee_nip,
                                size: 20,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: item.employee_position || "-",
                                size: 20,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: item.leave_type_name,
                                size: 20,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `${format(new Date(item.start_date), "dd/MM/yy", { locale: id })} - ${format(new Date(item.end_date), "dd/MM/yy", { locale: id })}`,
                                size: 18,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                      }),
                    ],
                  })
                ),
              ],
            }),

            // Closing paragraph
            new Paragraph({
              children: [
                new TextRun({
                  text: `Demikian usulan cuti ini kami sampaikan untuk dapat diproses lebih lanjut sesuai ketentuan yang berlaku.`,
                  size: 22,
                }),
              ],
              spacing: { before: 300, after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.",
                  size: 22,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Signature section
            new Paragraph({
              children: [
                new TextRun({
                  text: `${organization.city}, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`,
                  size: 22,
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `${proposal.proposer_unit}`,
                  size: 22,
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Kepala Unit",
                  size: 22,
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 800 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: proposal.proposer_name,
                  size: 22,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "NIP. ___________________",
                  size: 22,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        },
      ],
    });

    // Generate the document as blob
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    console.log("Leave proposal letter generated successfully");
    return blob;
  } catch (error) {
    console.error("Error generating leave proposal letter:", error);
    throw new Error("Gagal generate surat usulan: " + error.message);
  }
};

/**
 * Download leave proposal letter
 */
export const downloadLeaveProposalLetter = async (proposalData, filename) => {
  try {
    const blob = await generateLeaveProposalLetter(proposalData);
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `Usulan_Cuti_${proposalData.proposal.proposer_unit}_${format(new Date(), "yyyy-MM-dd")}.docx`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    console.log("Leave proposal letter downloaded successfully");
    return true;
  } catch (error) {
    console.error("Error downloading leave proposal letter:", error);
    throw error;
  }
};

/**
 * Generate summary statistics for proposal
 */
export const generateProposalSummary = (proposalItems) => {
  const summary = {
    totalEmployees: proposalItems.length,
    leaveTypes: {},
    totalDays: 0,
    dateRange: {
      earliest: null,
      latest: null,
    },
  };

  proposalItems.forEach(item => {
    // Count by leave type
    if (!summary.leaveTypes[item.leave_type_name]) {
      summary.leaveTypes[item.leave_type_name] = 0;
    }
    summary.leaveTypes[item.leave_type_name]++;

    // Sum total days
    summary.totalDays += item.days_requested;

    // Track date range
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);

    if (!summary.dateRange.earliest || startDate < summary.dateRange.earliest) {
      summary.dateRange.earliest = startDate;
    }
    if (!summary.dateRange.latest || endDate > summary.dateRange.latest) {
      summary.dateRange.latest = endDate;
    }
  });

  return summary;
};
