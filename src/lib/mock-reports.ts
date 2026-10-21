/**
 * Data mock murni untuk fitur Laporan & Ekspor (L14).
 * 100% di sisi frontend, menjadi acuan kontrak antarmuka rekapitulasi data.
 */

export interface PeriodSummary {
  totalAssignments: number;
  completed: number;
  onTime: number;
  overdue: number;
  finalDocuments: number;
  cancelled: number;
}

export interface DivisionReportRow {
  divisionId: string;
  divisionName: string;
  divisionCode: string;
  totalAssignments: number;
  completed: number;
  overdue: number;
  finalDocuments: number;
}

export const MOCK_PERIOD_SUMMARY: PeriodSummary = {
  totalAssignments: 378,
  completed: 286,
  onTime: 248,
  overdue: 31,
  finalDocuments: 286,
  cancelled: 23,
};

export const MOCK_DIVISION_REPORT_ROWS: DivisionReportRow[] = [
  {
    divisionId: "div_hukum",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    totalAssignments: 80,
    completed: 68,
    overdue: 9,
    finalDocuments: 68,
  },
  {
    divisionId: "div_pengawasan",
    divisionName: "Pengawasan",
    divisionCode: "PGS",
    totalAssignments: 77,
    completed: 48,
    overdue: 14,
    finalDocuments: 48,
  },
  {
    divisionId: "div_sdm",
    divisionName: "SDM & Organisasi",
    divisionCode: "SDM",
    totalAssignments: 45,
    completed: 41,
    overdue: 2,
    finalDocuments: 41,
  },
  {
    divisionId: "div_sekretariat",
    divisionName: "Sekretariat",
    divisionCode: "SEK",
    totalAssignments: 70,
    completed: 28,
    overdue: 4,
    finalDocuments: 28,
  },
  {
    divisionId: "div_penindakan",
    divisionName: "Penindakan",
    divisionCode: "TND",
    totalAssignments: 106,
    completed: 101,
    overdue: 2,
    finalDocuments: 101,
  },
];
