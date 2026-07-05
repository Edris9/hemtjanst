// Excel-export via SheetJS (CDN), utan status-kolumnen.

function exportSessionerTillExcel(rows, filnamn) {
  const data = rows.map((r) => ({
    Datum: r.datum,
    Regnr: r.regnr,
    "Förare dag": r.forare_dag || "",
    "Förare kväll": r.forare_kvall || "",
    Uttag: formatKlockslag(r.uttag_tid),
    Inlämning: formatKlockslag(r.inlamning_tid),
    "Använda timmar": r.anvand_timmar ?? ""
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 11 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sessioner");
  XLSX.writeFile(wb, filnamn);
}
