"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import Cropper, { type Area } from "react-easy-crop";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ClinicalTabs } from "@/components/clinical/clinical-tabs";
import * as authApi from "@/lib/api/auth";
import * as filesApi from "@/lib/api/files";
import { ApiError } from "@/lib/types";

async function cropToPng(imageSrc: string, pixelCrop: Area) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () =>
      reject(new Error("Could not load image")),
    );
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  let paperLuma = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    const luma =
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    if (luma > paperLuma) paperLuma = luma;
  }

  const cutoff = Math.max(paperLuma * 0.82, 1);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    const luma =
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i] = 0;
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
    if (luma >= cutoff) {
      pixels[i + 3] = 0;
      continue;
    }
    const t = (cutoff - luma) / cutoff;
    pixels[i + 3] = Math.round(Math.min(255, t * t * 255));
  }
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) =>
        next ? resolve(next) : reject(new Error("Could not export PNG")),
      "image/png",
    );
  });
  return blob;
}

export function SignatureEditor({ onSaved }: { onSaved?: () => void }) {
  const { user, refreshUser } = useAuth();
  const padRef = useRef<SignatureCanvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [saving, setSaving] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const persistBlob = useCallback(
    async (blob: Blob) => {
      setSaving(true);
      try {
        const file = new File([blob], "signature.png", { type: "image/png" });
        const uploaded = await filesApi.uploadFile(file, "signature");
        await authApi.setMySignature(uploaded.id);
        await refreshUser();
        toast.success("Signature saved");
        onSaved?.();
      } catch (error) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Could not save signature",
        );
      } finally {
        setSaving(false);
      }
    },
    [onSaved, refreshUser],
  );

  const saveDrawn = async () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      toast.error("Draw a signature first");
      return;
    }
    const res = await fetch(pad.toDataURL("image/png"));
    await persistBlob(await res.blob());
  };

  const saveCropped = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Choose and crop an image first");
      return;
    }
    await persistBlob(await cropToPng(imageSrc, croppedAreaPixels));
  };

  return (
    <div className="space-y-3 bg-[var(--clinical-panel)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="clinical-label">Doctor signature</p>
          <p className="text-xs text-muted-foreground">
            Certificates cannot be issued until a signature is on file.
          </p>
        </div>
        {user?.signatureFile?.filePath ? (
          <img
            src={user.signatureFile.filePath}
            alt="Current signature"
            className="h-12 max-w-[160px] border border-border bg-white object-contain p-1"
          />
        ) : null}
      </div>

      <ClinicalTabs
        value={mode}
        onChange={(id) => setMode(id as "draw" | "upload")}
        tabs={[
          { id: "draw", label: "Draw" },
          { id: "upload", label: "Upload and crop" },
        ]}
      />

      {mode === "draw" ? (
        <div className="space-y-2">
          <div className="mx-auto w-full max-w-[300px] border border-border bg-white">
            {mounted ? (
              <SignatureCanvas
                ref={padRef}
                penColor="#111827"
                canvasProps={{
                  className: "h-40 w-full touch-none",
                }}
              />
            ) : (
              <div className="h-40" />
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => padRef.current?.clear()}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void saveDrawn()}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save signature
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Field
            label="Signature image"
            htmlFor="signature-upload"
            hint="Photo of a signature on paper. Crop after choosing."
          >
            <input
              id="signature-upload"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (imageSrc) URL.revokeObjectURL(imageSrc);
                const url = URL.createObjectURL(file);
                setImageSrc(url);
                setFileName(file.name);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full justify-start sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {fileName ? "Choose another photo" : "Choose signature photo"}
            </Button>
            {fileName ? (
              <p className="truncate text-xs text-muted-foreground">{fileName}</p>
            ) : null}
          </Field>
          {imageSrc ? (
            <div className="relative h-56 overflow-hidden border border-border bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={saving || !imageSrc}
            onClick={() => void saveCropped()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Crop and save
          </Button>
        </div>
      )}
    </div>
  );
}
