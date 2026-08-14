"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  uploadFile,
  type UploadPurpose,
} from "@/lib/api/files";
import { formatBytes, formatEnum } from "@/lib/format";
import { ApiError, type FilePurpose } from "@/lib/types";

const FILE_PURPOSES: FilePurpose[] = [
  "XRAY",
  "LAB_RESULT",
  "PRESCRIPTION",
  "CONSENT_FORM",
  "IDENTIFICATION",
  "REFERRAL",
  "RECEIPT",
  "OTHER",
];

/**
 * Uploading and attaching are two calls that must both succeed: a file that is
 * uploaded but never attached is orphaned. The dialog therefore runs them as
 * one operation and only closes when the attach succeeds.
 */
export function UploadAttachDialog({
  open,
  onOpenChange,
  bucket,
  title,
  description,
  onAttach,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: UploadPurpose;
  title: string;
  description?: string;
  onAttach: (input: {
    fileId: string;
    purpose: FilePurpose;
    description?: string;
  }) => Promise<unknown>;
  onDone?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<FilePurpose>("XRAY");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setFile(null);
    setPurpose("XRAY");
    setCaption("");
    setError(null);
  };

  const pickFile = (next: File | null) => {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    // Checked here as well as server-side so the user is not made to wait for a
    // 413 or 415 that is knowable up front.
    if (!ACCEPTED_UPLOAD_TYPES.includes(next.type as (typeof ACCEPTED_UPLOAD_TYPES)[number])) {
      setError("Only JPEG, PNG and WebP images are accepted.");
      setFile(null);
      return;
    }
    if (next.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${formatBytes(next.size)}. The limit is 10 MB.`);
      setFile(null);
      return;
    }
    setFile(next);
  };

  const submit = async () => {
    if (!file) {
      setError("Choose an image first.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const uploaded = await uploadFile(file, bucket);
      await onAttach({
        fileId: uploaded.id,
        purpose,
        description: caption.trim() || undefined,
      });
      toast.success("Image attached");
      reset();
      onOpenChange(false);
      onDone?.();
    } catch (uploadError) {
      if (uploadError instanceof ApiError) {
        // 429 is worth naming explicitly: the limit is 10 uploads per 15
        // minutes, and a generic error would leave the user retrying blindly.
        if (uploadError.status === 429) {
          setError("Upload limit reached. Try again in a few minutes.");
        } else if (uploadError.status === 413) {
          setError("That file is too large. The limit is 10 MB.");
        } else if (uploadError.status === 415) {
          setError("Only JPEG, PNG and WebP images are accepted.");
        } else {
          setError(uploadError.message);
        }
      } else {
        setError("Upload failed. Check your connection and try again.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Image" htmlFor="upload-file" required hint="JPEG, PNG or WebP · max 10 MB">
            <Input
              id="upload-file"
              type="file"
              accept={ACCEPTED_UPLOAD_TYPES.join(",")}
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
              className="file:mr-3 file:border-0 file:bg-transparent file:font-mono file:text-xs"
            />
          </Field>

          <Field label="Purpose" required>
            <Select value={purpose} onValueChange={(value) => setPurpose(value as FilePurpose)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_PURPOSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {formatEnum(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Caption" htmlFor="upload-caption">
            <Input
              id="upload-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Optional note"
            />
          </Field>

          {file ? (
            <p className="font-mono text-[10px] text-muted-foreground">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : null}

          {error ? (
            <p
              className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !file}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {pending ? "Uploading" : "Upload and attach"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
