"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clinic/template");
      if (!res.ok) {
        throw new Error("Failed to load clinic settings");
      }
      const data = await res.json();
      setTemplateUrl(data.templateUrl || null);
      if (data.clinicName) setClinicName(data.clinicName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error fetching settings");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10MB");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/clinic/template", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload template");
      }

      setTemplateUrl(data.templateUrl);
      setSuccess("Letterhead template uploaded successfully!");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload template");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!confirm("Are you sure you want to remove the current letterhead template?")) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/clinic/template", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete template");
      }

      setTemplateUrl(null);
      setSuccess("Letterhead template removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove template");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto pb-12">
      <header className="space-y-1">
        <p className="eyebrow text-primary">Preferences & Branding</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
          Clinic Settings
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          Manage your clinic letterhead stationery template and report print settings.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs sm:text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-400">
          {success}
        </div>
      )}

      <div className="rounded-2xl sm:rounded-3xl border border-outline-variant/30 bg-surface p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-on-surface">
            Letterhead & Background Template
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-on-surface-variant">
            Upload your clinic letterhead (containing header, logo, watermark, and footer). When generating digital PDFs or printing on plain paper, this template will be placed in the background on every page.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs sm:text-sm text-on-surface-variant">
            Loading settings...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 items-start">
            {/* Upload Box */}
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/50 hover:border-primary bg-surface-container-low/50 hover:bg-surface-container-low p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  uploading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-on-surface">
                  {uploading ? "Uploading..." : "Click to upload letterhead template"}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  High resolution PNG or JPEG (A4 portrait recommended, max 10MB)
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-low p-4 text-xs text-on-surface-variant space-y-1.5">
                <p className="font-semibold text-on-surface">How it works:</p>
                <p>• Top 140pt (~49mm) is reserved for your header / logo.</p>
                <p>• Bottom 90pt (~32mm) is reserved for your footer & disclaimers.</p>
                <p>• Patient info and test results are cleanly printed in the center body.</p>
              </div>
            </div>

            {/* Preview Box */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Current Template Preview
              </span>

              {templateUrl ? (
                <div className="space-y-3">
                  <div className="relative aspect-[1/1.414] w-full rounded-2xl border border-outline-variant/40 bg-surface-container overflow-hidden shadow-sm flex items-center justify-center">
                    <Image
                      src={templateUrl}
                      alt="Letterhead Template"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="rounded-xl border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTemplate}
                      disabled={deleting}
                      className="rounded-xl border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
                    >
                      {deleting ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center aspect-[1/1.414] w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low text-center p-6">
                  <svg
                    className="h-10 w-10 text-on-surface-variant/40 mb-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p className="text-xs font-medium text-on-surface-variant">
                    No custom template uploaded yet
                  </p>
                  <p className="mt-1 text-[11px] text-on-surface-variant/70">
                    Reports will print in standard plain stationery mode
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
