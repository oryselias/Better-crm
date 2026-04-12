'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  LabReport,
  TestCatalog,
  TestResult,
  getReportById,
  getTestCatalog,
  updateReport,
  updateReportDetails,
} from '@/lib/reports/services';
import { evaluateReferenceRange } from '@/lib/reports/reference-ranges';

type VisibleReportTest = {
  testId: string;
  test?: TestCatalog;
  results?: TestResult[];
};

type ReportResultRow = {
  key: string;
  label: string;
  parameter: TestCatalog['parameters'][number] | null;
  result?: TestResult;
  isTestHeader?: boolean;
  isStandaloneTest?: boolean;
};

function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function LabReportViewPage() {
  const params = useParams();
  const [report, setReport] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [editing, setEditing] = useState(false);
  const [testCatalog, setTestCatalog] = useState<TestCatalog[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedTests, setSelectedTests] = useState<TestCatalog[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [notes, setNotes] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showTestPicker, setShowTestPicker] = useState(true);

  const reportId = params.id as string;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getReportById(reportId);
        if (!cancelled) setReport(data);
      } catch (error) {
        console.error('Error loading report:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [reportId]);

  useEffect(() => {
    if (!editing || testCatalog.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setLoadingCatalog(true);
      try {
        const tests = await getTestCatalog();
        if (!cancelled) setTestCatalog(tests);
      } catch (error) {
        console.error('Error loading test catalog:', error);
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once when editing starts; testCatalog.length guard prevents re-fetch
  }, [editing]);

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [paperSize, setPaperSize] = useState<"A4" | "A5">("A4");
  const [includeHeader, setIncludeHeader] = useState(true);
  const testSearchTerm = testSearchQuery.trim().toLowerCase();

  // '' = All Departments
  const categoryOptions = useMemo(() =>
    Array.from(new Set(testCatalog.map((t) => t.category || 'Other'))).sort((a, b) => a.localeCompare(b)),
    [testCatalog]);

  const selectedIdSet = useMemo(() => new Set(selectedTests.map((t) => t.id)), [selectedTests]);
  const availableTests = useMemo(() => testCatalog.filter((t) => !selectedIdSet.has(t.id)), [testCatalog, selectedIdSet]);

  const suggestedTests = useMemo(() => {
    const filtered = availableTests.filter((test) => {
      if (selectedCategory && (test.category || 'Other') !== selectedCategory) return false;
      if (!testSearchTerm) return true;
      return test.name.toLowerCase().includes(testSearchTerm) || (test.code ?? '').toLowerCase().includes(testSearchTerm);
    });
    const limit = selectedCategory ? 12 : 20;
    return filtered
      .slice()
      .sort((a, b) => {
        if (!testSearchTerm) return a.name.localeCompare(b.name);
        const score = (t: TestCatalog) => {
          const n = t.name.toLowerCase(), c = (t.code ?? '').toLowerCase();
          return (n.startsWith(testSearchTerm) || c.startsWith(testSearchTerm)) ? 0 : 1;
        };
        return score(a) - score(b) || a.name.localeCompare(b.name);
      })
      .slice(0, limit);
  }, [availableTests, selectedCategory, testSearchTerm]);

  const visibleTests: VisibleReportTest[] = useMemo(() => editing
    ? selectedTests.map((test) => ({
      testId: test.id,
      test,
      results: (test.parameters ?? []).map((parameter) => {
        const currentResult = resolveParameterResult(parameter.id, results, (test.parameters ?? []).length);
        return { parameterId: parameter.id, value: currentResult?.value ?? '', isAbnormal: currentResult?.isAbnormal ?? false };
      }),
    }))
    : report?.tests || [],
    [editing, selectedTests, results, report]);

  // No auto-select: default is "All Departments" (empty string)

  const buildPdfUrl = () =>
    `/api/reports/${reportId}/pdf?paperSize=${paperSize}&includeHeader=${includeHeader}`;

  const syncEditableState = useCallback((currentReport: LabReport) => {
    setSelectedTests(
      (currentReport.tests || [])
        .map((selectedTest) =>
          selectedTest.test
            ? selectedTest.test
            : undefined
        )
        .filter((test): test is TestCatalog => Boolean(test))
    );
    setResults(
      (currentReport.tests || []).flatMap((selectedTest) =>
        (selectedTest.results || []).map((result) => ({
          parameterId: result.parameterId,
          value: result.value ?? '',
          isAbnormal: result.isAbnormal ?? false,
          notes: result.notes,
        }))
      )
    );
    setNotes(currentReport.notes || '');
    setReferredBy(currentReport.referred_by || '');
    setTestSearchQuery('');
    setSelectedCategory(''); // reset to "All Departments"
    setShowTestPicker(false);
  }, []);

  useEffect(() => {
    if (!report || editing) {
      return;
    }

    if (window.location.hash === '#edit' || window.location.search.includes('edit=1')) {
      syncEditableState(report);
      setEditing(true);
      window.history.replaceState(null, '', `/lab-report/${reportId}`);
    }
  }, [editing, report, reportId, syncEditableState]);

  const fetchPdfBlob = async () => {
    const response = await fetch(buildPdfUrl(), { cache: 'no-store' });
    if (!response.ok) {
      let message = 'Failed to generate PDF';
      try {
        const data = await response.json();
        if (data?.error) {
          message = data.error;
        }
      } catch {
        // Ignore non-JSON error bodies.
      }
      throw new Error(message);
    }

    return response.blob();
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const blob = await fetchPdfBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lab-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 0);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
    setPrintingPdf(true);
    try {
      const blob = await fetchPdfBlob();
      const url = window.URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          window.URL.revokeObjectURL(url);
          iframe.remove();
          setPrintingPdf(false);
        };

        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) {
          cleanup();
          return;
        }

        iframeWindow.onafterprint = cleanup;
        iframeWindow.focus();
        iframeWindow.print();

        // Fallback only if onafterprint never fires (e.g. browser doesn't support it)
        window.setTimeout(cleanup, 60000);
      };
    } catch (error) {
      console.error('Error printing PDF:', error);
      alert(error instanceof Error ? error.message : 'Failed to print PDF. Please try again.');
      setPrintingPdf(false);
      return;
    }
  };

  const handleComplete = async () => {
    if (!report) return;
    setUpdating(true);
    try {
      await updateReport(report.id, { status: 'completed' });
      setReport(prev => prev ? { ...prev, status: 'completed' } : null);
    } catch (error) {
      console.error('Error completing report:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartEditing = () => {
    if (!report) return;
    syncEditableState(report);
    setEditing(true);
  };

  const handleCancelEditing = () => {
    if (report) {
      syncEditableState(report);
    }
    setEditing(false);
  };

  const handleAddTest = (test: TestCatalog) => {
    setSelectedTests((prev) => {
      if (prev.some((selected) => selected.id === test.id)) {
        return prev;
      }

      return [...prev, test];
    });
    setTestSearchQuery('');
    setShowTestPicker(Boolean(selectedCategory));
  };

  const handleRemoveTest = (test: TestCatalog) => {
    setSelectedTests((prev) => prev.filter((selected) => selected.id !== test.id));
    setResults((prev) =>
      prev.filter(
        (result) => !(test.parameters ?? []).some((parameter) => parameter.id === result.parameterId)
      )
    );
  };

  const handleSaveEdits = async () => {
    if (!report) return;

    setSavingEdits(true);
    try {
      const updatedReport = await updateReportDetails(report.id, {
        patientId: report.patient_id,
        selectedTests: selectedTests.map((test) => test.id),
        results,
        notes: notes || undefined,
        status: report.status,
        referredBy: referredBy || undefined,
      });

      const hydratedReport = await getReportById(updatedReport.id);
      const nextReport = hydratedReport || {
        ...report,
        ...updatedReport,
        notes: updatedReport.notes,
        tests: updatedReport.tests,
      };
      setReport(nextReport);
      syncEditableState(nextReport);
      setEditing(false);
    } catch (error) {
      console.error('Error updating report:', error);
      alert(error instanceof Error ? error.message : 'Failed to save changes.');
    } finally {
      setSavingEdits(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-container-lowest">
        <p className="text-on-surface-variant">Report not found</p>
        <Link href="/lab-report" className="btn-primary">
          Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      {/* Non-print header */}
      <header className="surface border-b border-outline-variant/30 print:hidden">
        <div className="mx-auto flex max-w-4xl flex-col md:flex-row md:items-center justify-between px-4 py-4 gap-4 md:gap-0">
          <div className="flex items-center gap-4">
            <Link
              href="/lab-report"
              aria-label="Back to reports"
              className="flex items-center gap-2 rounded-lg p-2 text-on-surface-variant hover:bg-surface-container shrink-0"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-on-surface truncate">
                Report #{report.report_no || report.id.slice(0, 8)}
              </h1>
              <p className="text-sm text-on-surface-variant">
                {report.status === 'completed' ? 'Completed' : 'Pending'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3 rounded-lg bg-surface-container-high px-3 py-1.5 mr-0 md:mr-2 overflow-x-auto text-sm shrink-0 whitespace-nowrap">
              <label className="flex items-center gap-2 text-on-surface cursor-pointer shrink-0">
                <span className="text-on-surface-variant hidden sm:inline">Size:</span>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as "A4" | "A5")}
                  className="rounded border border-outline-variant/30 bg-surface-container py-0.5 px-2 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                </select>
              </label>

              <div className="h-4 w-px bg-outline-variant/30 shrink-0"></div>

              <label className="flex items-center gap-2 text-on-surface cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                />
                <span className="hidden sm:inline">Header</span>
                <span className="sm:hidden">Hdr</span>
              </label>
            </div>

            {report.status === 'pending' && (
              <button
                onClick={handleComplete}
                disabled={updating || editing}
                className="rounded-full bg-secondary px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-on-secondary hover:bg-secondary/90 disabled:opacity-50 shrink-0"
              >
                {updating ? 'Saving...' : 'Complete'}
              </button>
            )}
            {editing ? (
              <>
                <button
                  onClick={handleCancelEditing}
                  disabled={savingEdits}
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 shrink-0"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdits}
                  disabled={savingEdits}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50 shrink-0"
                >
                  {savingEdits ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEditing}
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-on-surface hover:bg-surface-container shrink-0"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf || editing}
              aria-label="Download PDF"
              className="inline-flex items-center gap-2 rounded-full bg-info px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-white hover:bg-info/90 disabled:opacity-50 shrink-0"
              title="Download PDF"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">{generatingPdf ? '...' : 'PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={printingPdf || editing}
              aria-label="Print"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 shrink-0"
              title="Print"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="hidden sm:inline">{printingPdf ? '...' : 'Print'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Print-friendly Report */}
      <div className="mx-auto max-w-4xl px-0 sm:px-4 py-4 print:p-0">
        <div className="surface rounded-2xl sm:rounded-lg border border-outline-variant/30 p-3 sm:p-8 shadow-sm print:border-none print:shadow-none">
          {/* Clinic Header */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-on-surface">
              {report.clinic?.name || 'Laboratory'}
            </h2>
            <p className="text-sm text-on-surface-variant">Laboratory Report</p>
          </div>

          {/* Patient Info */}
          <div className="mb-6 rounded-xl bg-surface-container p-4">
            <h3 className="mb-3 text-sm font-semibold text-on-surface-variant">Patient Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-on-surface-variant">Name</p>
                <p className="font-medium text-on-surface">{report.patient?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Phone</p>
                <p className="font-medium text-on-surface">{report.patient?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Report Date</p>
                <p className="font-medium text-on-surface">{formatDate(report.created_at)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Report No.</p>
                <p className="font-medium text-on-surface">{report.report_no || report.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Referred By</p>
                {editing ? (
                  <input
                    type="text"
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value)}
                    placeholder="e.g. Dr. Sharma — leave empty for Self"
                    className="w-full max-w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-1.5 text-base md:text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                ) : (
                  <p className="font-medium text-on-surface truncate">
                    {report.referred_by || 'Self'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div className="mb-6 rounded-xl border border-outline-variant/30 bg-surface-container p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-on-surface">Edit Selected Tests</h3>
                <p className="text-sm text-on-surface-variant">
                  Add or remove tests, then update their results below.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <label className="mb-2 block text-sm font-medium text-on-surface">
                    Search Test
                  </label>
                  <input
                    type="text"
                    value={testSearchQuery}
                    onChange={(e) => {
                      setTestSearchQuery(e.target.value);
                      setShowTestPicker(true);
                    }}
                    onFocus={() => setShowTestPicker(true)}
                    onBlur={() => {
                      window.setTimeout(() => setShowTestPicker(false), 120);
                    }}
                    placeholder="Type test name or code..."
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />

                  {showTestPicker && suggestedTests.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-outline-variant/30 bg-surface shadow-xl">
                      {suggestedTests.map((test) => (
                        <button
                          key={test.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleAddTest(test)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-lowest"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-on-surface">{test.name}</p>
                            <p className="text-xs text-on-surface-variant">
                              {test.category || 'Other'} · {test.code}
                            </p>
                          </div>
                          <p className="shrink-0 text-xs font-medium text-primary">Add</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-on-surface">
                    Department
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setShowTestPicker(true);
                    }}
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">All Departments</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
                {loadingCatalog
                  ? 'Loading available tests...'
                  : testSearchTerm
                    ? suggestedTests.length > 0
                      ? `Showing the top ${suggestedTests.length} matches. Pick a test from the dropdown to add it.`
                      : 'No matching tests found. Try a different name, code, or department.'
                    : selectedCategory
                      ? `Showing tests from ${selectedCategory}. Search within this department or pick from the dropdown.`
                      : selectedCategory
                        ? `Showing tests from ${selectedCategory}. Type to search or click to add.`
                        : 'Showing all tests. Filter by department or type to search.'}
              </div>

              <div className="mt-4 space-y-3">
                {selectedTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-on-surface">{test.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {test.category || 'Other'} · {test.code}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTest(test)}
                      className="shrink-0 rounded-full border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Results */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-on-surface-variant">Test Results</h3>
            <div className="overflow-x-auto">
              {(() => {
                // Group result rows by department/category
                type GroupedDept = { dept: string; rows: ReportResultRow[] };
                const groups: GroupedDept[] = [];
                const deptMap = new Map<string, ReportResultRow[]>();

                for (const selectedTest of visibleTests) {
                  const dept = selectedTest.test?.category || 'Other';
                  const parameters = selectedTest.test?.parameters || [];
                  let testRows: ReportResultRow[];

                  if (parameters.length === 0) {
                    testRows = [{
                      key: `${selectedTest.testId}-empty`,
                      label: selectedTest.test?.name || 'Unknown Test',
                      parameter: null,
                      result: selectedTest.results?.[0],
                      isStandaloneTest: true,
                    }];
                  } else if (parameters.length === 1) {
                    testRows = [{
                      key: `${selectedTest.testId}-${parameters[0].id}`,
                      label: selectedTest.test?.name || 'Unknown Test',
                      parameter: parameters[0],
                      result: resolveParameterResult(parameters[0].id, selectedTest.results, 1),
                      isStandaloneTest: true,
                    }];
                  } else {
                    testRows = [
                      {
                        key: `${selectedTest.testId}-header`,
                        label: selectedTest.test?.name || 'Unknown Test',
                        parameter: null,
                        isTestHeader: true,
                      },
                      ...parameters.map((parameter) => ({
                        key: `${selectedTest.testId}-${parameter.id}`,
                        label: parameter.name,
                        parameter,
                        result: resolveParameterResult(parameter.id, selectedTest.results, parameters.length),
                      }))
                    ];
                  }

                  if (!deptMap.has(dept)) {
                    deptMap.set(dept, []);
                    groups.push({ dept, rows: deptMap.get(dept)! });
                  }
                  deptMap.get(dept)!.push(...testRows);
                }

                return groups.map(({ dept, rows: deptRows }) => (
                  <div key={dept} className="mb-4">
                    <div className="rounded-lg bg-primary/10 px-4 py-2 mb-2">
                      <h4 className="text-center text-sm font-bold tracking-wide text-primary uppercase">
                        {dept}
                      </h4>
                    </div>
                    <table className="w-full text-sm mb-2 whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-outline-variant/30">
                          <th className="pb-2 pr-4 text-left font-medium text-on-surface-variant">Test</th>
                          <th className="pb-2 px-4 text-right font-medium text-on-surface-variant">Result</th>
                          <th className="pb-2 px-4 text-right font-medium text-on-surface-variant">Unit</th>
                          <th className="pb-2 px-4 text-right font-medium text-on-surface-variant">Normal Range</th>
                          <th className="pb-2 pl-4 text-right font-medium text-on-surface-variant">Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptRows.map((row) => {
                          if (row.isTestHeader) {
                            return (
                              <tr key={row.key} className="bg-surface-container/30 border-b border-outline-variant/10">
                                <td colSpan={5} className="py-2.5 px-2 font-bold text-on-surface text-sm">{row.label}</td>
                              </tr>
                            );
                          }

                          if (!row.parameter) {
                            return (
                              <tr key={row.key} className="border-b border-outline-variant/10">
                                <td className={`py-2 text-on-surface ${row.isStandaloneTest ? 'px-2 font-bold text-sm' : 'pl-6'}`}>{row.label}</td>
                                <td className="py-2 text-right font-medium text-on-surface">
                                  {row.result?.value || '—'}
                                </td>
                                <td className="py-2 text-right text-on-surface-variant">—</td>
                                <td className="py-2 text-right text-on-surface-variant">—</td>
                                <td className="py-2 text-right text-on-surface-variant">—</td>
                              </tr>
                            );
                          }

                          const evaluated = evaluateReferenceRange(
                            row.parameter,
                            row.result?.value ?? '',
                            report.patient?.sex
                          );

                          return (
                            <tr
                              key={row.key}
                              className={`border-b border-outline-variant/10 ${evaluated.isAbnormal ? 'bg-red-500/5' : ''}`}
                            >
                              <td className={`py-2 text-on-surface ${row.isStandaloneTest ? 'px-2 font-bold text-sm' : 'pl-6'}`}>{row.label}</td>
                              <td className={`py-2 text-right font-medium ${evaluated.isAbnormal ? 'text-red-500 font-bold' : 'text-on-surface'}`}>
                                {editing ? (
                                  Array.isArray(row.parameter.selectOptions) && row.parameter.selectOptions.length > 0 ? (
                                    <select
                                      value={(row.result?.value as string) || ''}
                                      onChange={(e) => {
                                        setResults((prev) => {
                                          const existing = prev.find((item) => item.parameterId === row.parameter!.id);
                                          if (existing) {
                                            return prev.map((item) =>
                                              item.parameterId === row.parameter!.id
                                                ? { ...item, value: e.target.value }
                                                : item
                                            );
                                          }

                                          return [
                                            ...prev,
                                            { parameterId: row.parameter!.id, value: e.target.value, isAbnormal: false },
                                          ];
                                        });
                                      }}
                                      className="w-28 md:w-32 rounded-md border border-outline-variant/30 bg-surface-container-lowest px-2 md:px-3 py-1.5 text-left text-base md:text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    >
                                      <option value="">Select result</option>
                                      {row.parameter.selectOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={(row.result?.value as string) || ''}
                                      onChange={(e) => {
                                        setResults((prev) => {
                                          const existing = prev.find((item) => item.parameterId === row.parameter!.id);
                                          if (existing) {
                                            return prev.map((item) =>
                                              item.parameterId === row.parameter!.id
                                                ? { ...item, value: e.target.value }
                                                : item
                                            );
                                          }

                                          return [
                                            ...prev,
                                            { parameterId: row.parameter!.id, value: e.target.value, isAbnormal: false },
                                          ];
                                        });
                                      }}
                                      className="w-24 md:w-28 rounded-md border border-outline-variant/30 bg-surface-container-lowest px-2 md:px-3 py-1.5 text-right text-base md:text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    />
                                  )
                                ) : (
                                  row.result?.value || '—'
                                )}
                              </td>
                              <td className="py-2 text-right text-on-surface-variant">
                                {row.parameter.unit || '—'}
                              </td>
                              <td className={`py-2 text-right ${evaluated.isAbnormal ? 'font-semibold text-red-500' : 'text-on-surface-variant'}`}>
                                {evaluated.referenceRange}
                              </td>
                              <td className="py-2 text-right">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${evaluated.isAbnormal
                                    ? 'bg-error-container text-on-error-container'
                                    : evaluated.status === 'normal' || evaluated.status === 'negative'
                                      ? 'bg-secondary-container text-on-secondary-container'
                                      : 'bg-surface-container text-on-surface-variant'
                                    }`}
                                >
                                  {evaluated.flagLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Notes */}
          {(editing || report.notes) && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-on-surface-variant">Notes</h3>
              {editing ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this report..."
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
                />
              ) : (
                <p className="text-sm text-on-surface">{report.notes}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-on-surface-variant">
            <p>Generated by Better CRM • This is a computer-generated report</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function _formatResultLabel(testName: string, parameterName: string, parameterCount: number) {
  if (parameterCount <= 1) {
    return testName;
  }

  if (testName.trim().toLowerCase() === parameterName.trim().toLowerCase()) {
    return testName;
  }

  return `${testName} - ${parameterName}`;
}

function resolveParameterResult(
  parameterId: string,
  results: TestResult[] | undefined,
  parameterCount: number
) {
  if (!results?.length) {
    return undefined;
  }

  const exactMatch = results.find((result) => result.parameterId === parameterId);
  if (exactMatch) {
    return exactMatch;
  }

  if (parameterCount === 1 && results.length === 1) {
    return results[0];
  }

  return undefined;
}
