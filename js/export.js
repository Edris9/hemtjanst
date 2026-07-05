// Excel-export via SheetJS (CDN).

function exportSessionerTillExcel(rows, filnamn) {
  const data = rows.map((r) => ({
    Datum: r.datum,
    Regnr: r.regnr,
    Förare: r.forare,
    Tid: formatKlockslag(r.tid),
    Skift: skift(r.tid)
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 11 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sessioner");
  XLSX.writeFile(wb, filnamn);
}
