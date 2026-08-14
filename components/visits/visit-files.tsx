"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { AuthImage } from "@/components/files/auth-image";
import { UploadAttachDialog } from "@/components/files/upload-attach-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/states";
import * as visitsApi from "@/lib/api/visits";
import { formatBytes, formatDateTime, formatEnum } from "@/lib/format";
import { ApiError, type AttachedFile } from "@/lib/types";

export function VisitFiles({
  visitId,
  files,
  visitFinished,
  onChanged,
}: {
  visitId: string;
  files: AttachedFile[];
  visitFinished: boolean;
  onChanged: () => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttachedFile | null>(null);

  const detachMutation = useMutation({
    // This endpoint answers 204 with an empty body, so nothing is parsed.
    mutationFn: (fileId: string) => visitsApi.detachFileFromVisit(visitId, fileId),
    onSuccess: () => {
      toast.success("Image removed");
      setDeleteTarget(null);
      onChanged();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not remove image");
      setDeleteTarget(null);
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Imaging and documents</CardTitle>
        {!visitFinished ? (
          <Can allOf={["file.upload", "visit.attachImage"]}>
            <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
              <ImagePlus className="h-3.5 w-3.5" />
              Attach
            </Button>
          </Can>
        ) : null}
      </CardHeader>

      {files.length === 0 ? (
        <EmptyState
          className="border-0"
          title="No images attached"
          description="Radiographs and clinical photos appear here."
        />
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((attached) => (
            <figure key={attached.id} className="tech-card overflow-hidden">
              <AuthImage
                src={attached.file.filePath}
                alt={attached.description ?? attached.file.fileName}
                className="aspect-video w-full bg-muted object-cover"
              />
              <figcaption className="border-t border-border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="outline">{formatEnum(attached.purpose)}</Badge>
                    <p className="mt-1 truncate text-xs">
                      {attached.description ?? attached.file.fileName}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {formatBytes(attached.file.sizeBytes)} · {attached.uploadedBy.fullName}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {formatDateTime(attached.createdAt)}
                    </p>
                  </div>
                  {!visitFinished ? (
                    <Can permission="visit.delete">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove image"
                        onClick={() => setDeleteTarget(attached)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </Can>
                  ) : null}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <UploadAttachDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        bucket="visit"
        title="Attach an image to this visit"
        onAttach={(input) => visitsApi.attachFileToVisit(visitId, input)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove this image?"
        description="It will be detached from the visit."
        confirmLabel="Remove"
        destructive
        pending={detachMutation.isPending}
        onConfirm={() => deleteTarget && detachMutation.mutate(deleteTarget.fileId)}
      />
    </Card>
  );
}
