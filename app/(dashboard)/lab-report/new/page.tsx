'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Patient,
  TestCatalog,
  TestResult,
  createPatient,
  searchPatients,
  getTestCatalog,
  createReport
} from '@/lib/reports/services';
import { isValidPatientPhone } from '@/lib/patients/phone';
import { evaluateReferenceRange } from '@/lib/reports/reference-ranges';

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const [selectedTests, setSelectedTests] = useState<TestCatalog[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [notes, setNotes] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingPending, setSavingPending] = useState(false);

  // Patient search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientError, setNewPatientError] = useState<string | null>(null);
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: '',
    age: 0,         
    sex: '',
    phone: ''
  });

  // Test catalog
  const [testCatalog, setTestCatalog] = useState<TestCatalog[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showTestPicker, setShowTestPicker] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      try {
        const tests = await getTestCatalog();
        if (!cancelled) setTestCatalog(tests);
      } catch (error) {
        console.error('Error loading test catalog:', error);
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    };
    loadCatalog();
    return () => { cancelled = true; };
  }, []);

  // Search patients with AbortController to prevent stale results
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) { setSearchResults([]); return; }
      setSearching(true);
      try {
        const patients = await searchPatients(searchQuery);
        if (!cancelled) setSearchResults(patients);
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

  const testSearchTerm = testSearchQuery.trim().toLowerCase();

  // '' means "All Departments"
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
          if (n.startsWith(testSearchTerm) || c.startsWith(testSearchTerm)) return 0;
          return 1;
        };
        return score(a) - score(b) || a.name.localeCompare(b.name);
      })
      .slice(0, limit);
  }, [availableTests, selectedCategory, testSearchTerm]);

  const canProceedToStep3 = selectedTests.length > 0;
  const canSubmit = patient && selectedTests.length > 0;

  const handlePatientSelected = (p: Patient) => {
    setPatient(p);
    setSearchQuery('');
    setSearchResults([]);
    setShowNewPatient(false);
    setNewPatientError(null);
    setStep(2);
  };

 const handleCreatePatient = async (e: React.FormEvent) => {
  e.preventDefault();

  if (newPatientForm.phone && !isValidPatientPhone(newPatientForm.phone)) {
    setNewPatientError('Phone number must be exactly 10 digits.');
    return;
  }

  try {
    setNewPatientError(null);

    const newPatient = await createPatient(newPatientForm);
    setPatient(newPatient);
    setShowNewPatient(false);

  
    setNewPatientForm({
      full_name: '',
      age: 0,
      sex: '',
      phone: ''
    });

    setStep(2);
  } catch (error) {
    console.error('Error creating patient:', error);
    setNewPatientError(
      error instanceof Error ? error.message : 'Failed to create patient'
    );
  }
};

  const handleSavePending = async () => {
    if (!canSubmit) return;
    setSavingPending(true);
    try {
      await createReport({
        patientId: patient!.id,
        selectedTests: selectedTests.map(t => t.id),
        results,
        notes: notes || undefined,
        referredBy: referredBy || undefined,
      });
      alert('Report saved as pending!');
      router.push('/lab-report');
    } catch (error) {
      console.error('Error saving pending:', error);
      alert('Failed to save report');
      setSavingPending(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const newReport = await createReport({
        patientId: patient!.id,
        selectedTests: selectedTests.map(t => t.id),
        results,
        notes: notes || undefined,
        referredBy: referredBy || undefined,
      });
      // Navigate to the newly created report so user can download PDF
      router.push(`/lab-report/${newReport.id}`);
    } catch (error) {
      console.error('Error creating report:', error);
      setSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      {/* Header */}
      <header className="surface border-b border-outline-variant/30">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.04em] text-on-surface">
                Create New Report
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-on-surface-variant">
                Register patient and add test details
              </p>
            </div>
            <Link
              href="/lab-report"
              className="inline-flex items-center gap-2 rounded-md border border-outline-variant/30 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-on-surface transition-colors hover:bg-surface-container shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          {[
            { num: 1, label: 'Patient' },
            { num: 2, label: 'Tests' },
            { num: 3, label: 'Results' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-md font-medium ${step >= s.num
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
                  }`}
              >
                {s.num}
              </div>
              {idx < 2 && (
                <div
                  className={`mx-2 h-1 w-16 ${step > s.num ? 'bg-primary' : 'bg-surface-container'
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 sm:gap-8 mb-6 text-xs sm:text-sm text-center">
          <span className={step >= 1 ? 'text-primary font-medium' : 'text-on-surface-variant'}>
            Register<br className="sm:hidden" /> Patient
          </span>
          <span className={step >= 2 ? 'text-primary font-medium' : 'text-on-surface-variant'}>
            Select<br className="sm:hidden" /> Tests
          </span>
          <span className={step >= 3 ? 'text-primary font-medium' : 'text-on-surface-variant'}>
            Enter<br className="sm:hidden" /> Results
          </span>
        </div>
      </div>

      {/* Form Content */}
      <div className="mx-auto max-w-4xl px-4 pb-12">
        <div className="surface rounded-lg border border-outline-variant/30 p-4 sm:p-6 shadow-sm">
          {/* Step 1: Patient Selection */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-on-surface mb-4">
                Step 1: Register Patient
              </h2>

              {!showNewPatient && (
                <div className="space-y-4">
                  {/* Search existing patients */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Search Existing Patient
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or phone number..."
                      className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-xl border border-outline-variant/30 bg-surface-container shadow-xl">
                        {searchResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handlePatientSelected(p)}
                            className="w-full px-4 py-3 text-left hover:bg-surface-container-lowest"
                          >
                            <p className="font-medium text-on-surface">{p.full_name}</p>
                            <p className="text-xs text-on-surface-variant">{p.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {searching && (
                      <div className="absolute right-3 top-9 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                  </div>

                  <div className="relative flex items-center gap-4 py-4">
                    <div className="flex-1 border-t border-outline-variant/30" />
                    <span className="text-sm text-on-surface-variant">or</span>
                    <div className="flex-1 border-t border-outline-variant/30" />
                  </div>

                  <button
                    onClick={() => setShowNewPatient(true)}
                    className="w-full rounded-md border border-dashed border-outline-variant/30 py-4 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors duration-200"
                  >
                    + Register New Patient
                  </button>
                </div>
              )}

              {/* Centered Modal for New Patient */}
              {showNewPatient && mounted && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
                  <div className="w-full max-w-lg rounded-[2rem] bg-surface-container-lowest p-8 shadow-2xl">
                    <form onSubmit={handleCreatePatient} className="space-y-4">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold tracking-[-0.04em] text-on-surface">Register New Patient</h3>
                        <button
                          type="button"
                          onClick={() => setShowNewPatient(false)}
                          className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-on-surface">
                          Full Name <span className="text-red-400">*</span>
                        </span>
                        <input
                          type="text"
                          value={newPatientForm.full_name}
                          onChange={(e) => setNewPatientForm(p => ({ ...p, full_name: e.target.value }))}
                          required
                          placeholder="Jane Doe"
                          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-on-surface">Age</span>
                          <input
                          type="number"
                          value={newPatientForm.age || ''}
                          onChange={(e) =>
                            setNewPatientForm((p) => ({
                              ...p,
                              age: e.target.value ? Number(e.target.value) : 0
                            }))
                          }
                          min="0"
                          max="150"
                          placeholder="25"
                          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        </label>
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-on-surface">Sex</span>
                          <select
                            value={newPatientForm.sex}
                            onChange={(e) => setNewPatientForm(p => ({ ...p, sex: e.target.value }))}
                            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                          >
                            <option value="">Unknown</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                      </div>

                      <label className="block space-y-1.5 mb-6">
                        <span className="text-sm font-medium text-on-surface">Phone</span>
                        <input
                          type="tel"
                          value={newPatientForm.phone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setNewPatientForm(p => ({ ...p, phone: digits }));
                            setNewPatientError(null);
                          }}
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="9876543210"
                          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </label>

                      {newPatientError && (
                        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                          {newPatientError}
                        </p>
                      )}

                      <button
                        type="submit"
                        className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        Register & Continue
                      </button>
                    </form>
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}

          {/* Step 2: Test Selection */}
          {step === 2 && (
            <div>
              <div className="mb-4 rounded-xl border border-secondary/30 bg-secondary-container p-4">
                <p className="text-sm text-on-secondary-container">
                  <strong>Patient Registered:</strong> {patient?.full_name}
                </p>
              </div>

              {/* Referred By */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Referred By (Optional)
                </label>
                <input
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  placeholder="e.g. Dr. Sharma — leave empty for Self"
                  className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <h2 className="text-lg font-semibold text-on-surface mb-4">
                Step 2: Select Tests
              </h2>

              {loadingCatalog ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : testCatalog.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant text-sm">
                  No tests available. Please contact your administrator to set up the test catalog.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-outline-variant/30 bg-surface-container p-4">
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
                          onBlur={(e) => {
                            // Only hide picker if the new focused element is not one of our buttons
                            const relatedTarget = e.relatedTarget as HTMLElement;
                            if (!relatedTarget || !relatedTarget.closest('button')) {
                              window.setTimeout(() => setShowTestPicker(false), 120);
                            }
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
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium text-on-surface">{test.name}</p>
                                  <p className="text-xs text-on-surface-variant">
                                    {test.category || 'Other'} · {test.code}
                                  </p>
                                </div>
                                <span className="shrink-0 text-xs font-medium text-primary">Add</span>
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
                      {testSearchTerm
                        ? suggestedTests.length > 0
                          ? `${suggestedTests.length} match${suggestedTests.length === 1 ? '' : 'es'}${selectedCategory ? ` in ${selectedCategory}` : ' across all departments'}. Click to add.`
                          : 'No matching tests found. Try a different name, code, or department.'
                        : selectedCategory
                          ? `Showing tests from ${selectedCategory}. Type to search or click to add.`
                          : 'Showing all tests. Filter by department or type to search.'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-outline-variant/30 bg-surface-container p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-on-surface">
                          Selected Tests ({selectedTests.length})
                        </h3>
                        <p className="text-sm text-on-surface-variant">
                          Added tests will appear here in the order you select them.
                        </p>
                      </div>
                    </div>

                    {selectedTests.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-lowest px-4 py-8 text-center text-sm text-on-surface-variant">
                        No tests added yet. Search for a test above and add it to this report.
                      </div>
                    ) : (
                      <div className="space-y-3">
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
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-outline-variant/30">
                <button
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto rounded-xl border border-outline-variant/30 px-6 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => { if (canProceedToStep3) setStep(3); }}
                  disabled={!canProceedToStep3}
                  className="w-full sm:w-auto rounded-md bg-primary px-8 py-2.5 text-sm font-medium text-on-primary hover:bg-primary/90 disabled:bg-surface-container disabled:text-on-surface-variant disabled:cursor-not-allowed cursor-pointer"
                >
                  Next: Enter Results
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Results & Submit */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-on-surface mb-4">
                Step 3: Enter Test Results
              </h2>

              <div className="space-y-4">
                {(() => {
                  // Group tests by category/department
                  const grouped = new Map<string, TestCatalog[]>();
                  for (const test of selectedTests) {
                    const dept = test.category || 'Other';
                    if (!grouped.has(dept)) grouped.set(dept, []);
                    grouped.get(dept)!.push(test);
                  }
                  return Array.from(grouped.entries()).map(([dept, tests]) => (
                    <div key={dept}>
                      {/* Department header */}
                      <div className="rounded-lg bg-primary/10 px-4 py-2 mb-3">
                        <h3 className="text-center text-sm font-bold tracking-wide text-primary uppercase">
                          {dept}
                        </h3>
                      </div>
                      {tests.map((test) => (
                        <div key={test.id} className="rounded-xl border border-outline-variant/30 p-4 mb-3">
                          <h4 className="font-medium text-on-surface mb-3">{test.name}</h4>
                          <p className="text-xs text-on-surface-variant mb-3">{test.code}</p>
                          {/* Results entry table matching Niglabs flow */}
                          {test.parameters && test.parameters.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm whitespace-nowrap">
                                <thead className="border-b border-outline-variant/30">
                                  <tr>
                                    <th className="py-2 pr-4 text-left font-medium text-on-surface-variant">Parameter</th>
                                    <th className="py-2 pr-4 text-left font-medium text-on-surface-variant">Result</th>
                                    <th className="py-2 pr-4 text-left font-medium text-on-surface-variant">Reference Range</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {test.parameters.map((param) => {
                                    const result = results.find(r => r.parameterId === param.id);
                                    const evaluated = evaluateReferenceRange(param, result?.value ?? '', patient?.sex);
                                    const selectOptions = Array.isArray(param.selectOptions) ? param.selectOptions : [];
                                    return (
                                      <tr key={param.id} className="border-b border-outline-variant/10">
                                        <td className="py-3 pr-4 font-medium text-on-surface">
                                          <div>{param.name}</div>
                                          {param.unit && <div className="text-xs font-normal text-on-surface-variant">{param.unit}</div>}
                                        </td>
                                        <td className="py-3 pr-4">
                                          {selectOptions.length > 0 ? (
                                            <select
                                              value={(result?.value as string) || ''}
                                              onChange={(e) => {
                                                setResults(prev => {
                                                  const existing = prev.find(r => r.parameterId === param.id);
                                                  if (existing) {
                                                    return prev.map(r => r.parameterId === param.id ? { ...r, value: e.target.value } : r);
                                                  }
                                                  return [...prev, { parameterId: param.id, value: e.target.value, isAbnormal: false }];
                                                });
                                              }}
                                              className="w-full min-w-[120px] text-gray-900 text-base md:text-sm rounded-md border border-outline-variant/30 bg-white px-3 py-2 md:py-1.5 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                                            >
                                              <option value="">Select result</option>
                                              {selectOptions.map((option) => (
                                                <option key={option} value={option}>
                                                  {option}
                                                </option>
                                              ))}
                                            </select>
                                          ) : (
                                            <input
                                              type="text"
                                              value={(result?.value as string) || ''}
                                              onChange={(e) => {
                                                setResults(prev => {
                                                  const existing = prev.find(r => r.parameterId === param.id);
                                                  if (existing) {
                                                    return prev.map(r => r.parameterId === param.id ? { ...r, value: e.target.value } : r);
                                                  }
                                                  return [...prev, { parameterId: param.id, value: e.target.value, isAbnormal: false }];
                                                });
                                              }}
                                              className="w-full min-w-[120px] text-gray-900 text-base md:text-sm rounded-md border border-outline-variant/30 bg-white px-3 py-2 md:py-1.5 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                                            />
                                          )}
                                        </td>
                                        <td className="py-3 pr-4 text-on-surface">
                                          {evaluated.referenceRange}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="rounded border border-dashed border-outline-variant/30 bg-surface-container-lowest p-4 text-center text-sm text-on-surface-variant">
                              No parameters defined for this test. Please update the test catalog.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-6 pt-4 border-t border-outline-variant/30">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add any notes about this report..."
                      className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto rounded-xl border border-outline-variant/30 px-6 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
                >
                  Back
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleSavePending}
                    disabled={!canSubmit || savingPending}
                    className="w-full sm:w-auto rounded-xl border border-outline-variant/30 px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50"
                  >
                    {savingPending ? 'Saving...' : 'Save as Pending'}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className="w-full sm:w-auto rounded-md bg-secondary px-6 py-2.5 text-sm font-medium text-on-secondary hover:bg-secondary/90 disabled:bg-surface-container disabled:text-on-surface-variant"
                  >
                    {submitting ? 'Creating...' : 'Create & Print'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
