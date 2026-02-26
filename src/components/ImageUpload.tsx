import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface Props {
  bucket?: string;
  value: string;          // current public URL or empty
  onChange: (url: string) => void;
  className?: string;
}

export default function ImageUpload({ bucket = "product-images", value, onChange, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600", upsert: false,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Preview */}
      {value && (
        <div className="relative inline-block">
          <img src={value} alt="product" className="h-24 w-24 rounded-lg object-cover border border-border" />
          <button
            type="button"
            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow"
            onClick={() => onChange("")}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Click or drag image to upload</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP — max 5 MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={handleChange}
      />

      {/* Fallback: also allow pasting a URL */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">or paste URL:</span>
        <input
          type="text"
          className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="https://…"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
