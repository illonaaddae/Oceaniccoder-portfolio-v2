import React, { useState, useRef } from "react";
import { FaUpload, FaSpinner, FaTimes } from "react-icons/fa";
import { uploadVideo } from "@/services/api/storage";
import type { FormFieldProps } from "./types";

export const LinksFields: React.FC<FormFieldProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadVideo(file);
      setForm({ ...form, demoVideoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearVideo = () => {
    setForm({ ...form, demoVideoUrl: "" });
    setError(null);
  };

  const isHostedVideo = form.demoVideoUrl && /\.(mp4|webm|ogg)(\?|$)/i.test(form.demoVideoUrl);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Live URL</label>
          <input
            type="url"
            value={form.liveUrl}
            onChange={(e) => setForm({ ...form, liveUrl: e.target.value })}
            className={inputClass}
            placeholder="https://myproject.com"
          />
        </div>
        <div>
          <label className={labelClass}>GitHub URL</label>
          <input
            type="url"
            value={form.githubUrl}
            onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
            className={inputClass}
            placeholder="https://github.com/..."
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Demo Video</label>

        {/* URL input — accepts MP4, YouTube, Loom. Direct uploaded MP4 fills this too. */}
        <input
          type="url"
          value={form.demoVideoUrl}
          onChange={(e) => setForm({ ...form, demoVideoUrl: e.target.value })}
          className={inputClass}
          placeholder="Paste an MP4, YouTube, or Loom URL, or upload an MP4 below"
        />

        {/* Upload button — for direct MP4 hosting (bypasses YouTube bot-gate) */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg"
            aria-label="Upload demo video file"
            title="Upload demo video file (MP4, WebM, or Ogg)"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-brand-link hover:bg-brand-accent-strong text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? (
              <>
                <FaSpinner className="animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <FaUpload /> Upload MP4
              </>
            )}
          </button>
          {isHostedVideo && (
            <button
              type="button"
              onClick={clearVideo}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
            >
              <FaTimes /> Remove
            </button>
          )}
        </div>

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

        <p className="mt-2 text-xs opacity-60">
          MP4 upload (max 50 MB) plays inline reliably. YouTube/Loom URLs may trigger a bot-check
          screen; upload MP4 for best results.
        </p>
      </div>
    </div>
  );
};
