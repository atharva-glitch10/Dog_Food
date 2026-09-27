import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, MinusCircle, Download, RotateCcw } from 'lucide-react';
import api from '../../services/api.ts';
import { useToast } from '../ui/Toast.tsx';
import { parseCsv, toCsvCell } from '../../utils/csv.ts';

interface ImportUserRow {
  name: string;
  email: string;
  role?: string;
  password?: string;
}

interface ImportRowResult {
  row: number;
  email: string;
  status: 'valid' | 'imported' | 'skipped' | 'error';
  errors: string[];
  temporaryPassword?: string;
}

interface ImportResult {
  dryRun: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  rows: ImportRowResult[];
}

const REQUIRED_COLUMNS = ['name', 'email'];
const OPTIONAL_COLUMNS = ['role', 'password'];

/** Convert parsed CSV into import rows; returns a file-level error for a bad header. */
function toImportRows(table: string[][]): { rows: ImportUserRow[]; error?: string } {
  if (table.length === 0) return { rows: [], error: 'The file is empty.' };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return { rows: [], error: `Missing required column(s): ${missing.join(', ')}. Expected header: name,email[,role][,password]` };
  }
  const index = (col: string) => header.indexOf(col);
  const rows = table.slice(1).map((cells) => {
    const get = (col: string) => (index(col) >= 0 ? (cells[index(col)] ?? '').trim() : '');
    const row: ImportUserRow = { name: get('name'), email: get('email') };
    const role = get('role').toUpperCase();
    if (role) row.role = role;
    const password = get('password');
    if (password) row.password = password;
    return row;
  });
  if (rows.length === 0) return { rows, error: 'The file has a header but no data rows.' };
  return { rows };
}

const STATUS_STYLE: Record<ImportRowResult['status'], { cls: string; icon: React.ElementType; label: string }> = {
  valid: { cls: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle, label: 'Valid' },
  imported: { cls: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle, label: 'Imported' },
  skipped: { cls: 'text-amber-600 dark:text-amber-400', icon: MinusCircle, label: 'Skipped' },
  error: { cls: 'text-rose-600 dark:text-rose-400', icon: AlertCircle, label: 'Error' },
};

export const BulkImportPanel: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportUserRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async ({ users, dryRun }: { users: ImportUserRow[]; dryRun: boolean }) =>
      ((await api.post(`/events/${eventId}/import/bulk`, { users, dryRun })) as any).data as ImportResult,
    onSuccess: (data) => {
      if (data.dryRun) {
        setPreview(data);
      } else {
        setResult(data);
        toastSuccess(`Imported ${data.imported} user(s); ${data.skipped} skipped.`);
      }
    },
    onError: (err: any) => toastError(err?.message || 'Import request failed.'),
  });

  const reset = () => {
    setFileName(null);
    setRows([]);
    setFileError(null);
    setPreview(null);
    setResult(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    reset();
    if (!file) return;
    setFileName(file.name);
    if (file.size > 1024 * 1024) {
      setFileError('The file is larger than 1 MB.');
      return;
    }
    const parsed = toImportRows(parseCsv(await file.text()));
    if (parsed.error) {
      setFileError(parsed.error);
      return;
    }
    setRows(parsed.rows);
    importMutation.mutate({ users: parsed.rows, dryRun: true });
  };

  const downloadCredentials = () => {
    if (!result) return;
    const lines = [['email', 'temporary_password'].map(toCsvCell).join(',')];
    for (const r of result.rows) {
      if (r.temporaryPassword) lines.push([r.email, r.temporaryPassword].map(toCsvCell).join(','));
    }
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imported-user-credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const shown = result ?? preview;
  const validCount = preview?.rows.filter((r) => r.status === 'valid').length ?? 0;
  const problemCount = preview ? preview.rows.length - validCount : 0;
  const credentialCount = result?.rows.filter((r) => r.temporaryPassword).length ?? 0;

  return (
    <div className="console-panel p-6 sm:p-8 space-y-5">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
          <span>Bulk User Import (CSV)</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Header row: <code className="font-mono">name,email</code> plus optional{' '}
          <code className="font-mono">{OPTIONAL_COLUMNS.join(',')}</code>. Role may be PARTICIPANT or JUDGE (admins can also
          import ORGANIZER). Rows without a password get a random temporary password. Existing emails are skipped, never
          modified. Up to 200 rows per file.
        </p>
      </div>

      {/* Step 1: choose file */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-secondary cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>{fileName ? 'Choose another file' : 'Choose CSV file'}</span>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        {fileName && <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{fileName}</span>}
        {(fileName || result) && (
          <button type="button" onClick={reset} className="btn-outline !py-2 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start over</span>
          </button>
        )}
      </div>

      {fileError && (
        <p className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800/60">
          {fileError}
        </p>
      )}
      {importMutation.isPending && <p className="text-sm text-slate-500">{preview ? 'Importing...' : 'Validating rows...'}</p>}
      {preview && preview.errors.length > 0 && preview.rows.length === 0 && (
        <p className="text-sm text-rose-700 dark:text-rose-300">{preview.errors.join(' ')}</p>
      )}

      {/* Step 2: confirm */}
      {preview && !result && preview.rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{validCount} valid</span>
            {problemCount > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-rose-600 dark:text-rose-400">{problemCount} will be skipped</span>
              </>
            )}
            {' '}of {preview.rows.length} rows. Nothing has been written yet.
          </p>
          <button
            type="button"
            onClick={() => importMutation.mutate({ users: rows, dryRun: false })}
            disabled={validCount === 0 || importMutation.isPending}
            className="btn-primary"
          >
            Import {validCount} user{validCount === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {/* Step 3: result */}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
            Imported {result.imported} user(s); {result.skipped} skipped.
          </p>
          {credentialCount > 0 && (
            <button type="button" onClick={downloadCredentials} className="btn-secondary !py-2 text-xs">
              <Download className="w-3.5 h-3.5" />
              <span>Download {credentialCount} temporary password{credentialCount === 1 ? '' : 's'} (CSV)</span>
            </button>
          )}
        </div>
      )}

      {shown && shown.rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4">Row</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {shown.rows.map((r) => {
                const style = STATUS_STYLE[r.status];
                const Icon = style.icon;
                return (
                  <tr key={r.row}>
                    <td className="py-2 px-4 text-slate-500">{r.row}</td>
                    <td className="py-2 px-4 font-mono text-slate-700 dark:text-slate-300">{r.email || '—'}</td>
                    <td className="py-2 px-4">
                      <span className={`inline-flex items-center gap-1 font-semibold ${style.cls}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {style.label}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                      {r.errors.join('; ') || (r.temporaryPassword ? 'Temporary password generated' : '')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
