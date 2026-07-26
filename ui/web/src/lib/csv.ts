const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Excel em pt-PT espera vírgula como separador decimal (e ";" como separador de campos,
// já usado abaixo) — um número com "." é importado como texto em vez de valor numérico.
function formatCsvCell(value: string | number): string {
  return typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value;
}

function escapeCsvCell(value: string | number): string {
  const s = formatCsvCell(value);
  // Só aspas/";"/quebras de linha exigem escape — vírgula é o separador decimal dos
  // números aqui, não o delimitador de campos, por isso não deve forçar aspas.
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map(row => row.map(escapeCsvCell).join(';'));
  // "sep=;" como primeira linha força o Excel a usar ";" ao abrir por duplo clique,
  // em vez de decidir pelas definições regionais do Windows (que podem ignorar o ";").
  return '﻿sep=;\r\n' + lines.join('\r\n');
}

/**
 * Gera um CSV (separador ";", compatível com o Excel em pt-PT) e guarda-o.
 * Dentro da app desktop (Tauri), um <a download> de blob é ignorado pelo WebView2
 * sem aviso — por isso usa-se o diálogo nativo "Guardar como" + escrita via comando
 * Rust. Fora do Tauri (browser), usa-se o mecanismo de download normal.
 */
export async function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = buildCsv(headers, rows);

  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');
    const path = await save({ defaultPath: filename, filters: [{ name: 'CSV', extensions: ['csv'] }] });
    if (!path) return;
    await invoke('save_text_file', { path, contents: csv });
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
