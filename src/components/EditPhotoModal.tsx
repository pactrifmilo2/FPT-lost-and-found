import { useEffect, useRef, useState } from "react";
import { useAction } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { useReference } from "@/lib/useReference";
import { editReport } from "@/lib/api/reports";
import { uploadImage, cleanupImage, validateImage } from "@/lib/api/storage";
import type { Report } from "@/types";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { CategoryThumb } from "./CategoryThumb";
export function EditPhotoModal({
  report,
  onClose,
}: {
  report: Report;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const { categoryById } = useReference();
  const action = useAction();
  const [file, setFile] = useState<File>(),
    [preview, setPreview] = useState<string>(),
    [removed, setRemoved] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function pick(next?: File) {
    if (!next) return;
    try {
      validateImage(next);
      setFile(next);
      setPreview(URL.createObjectURL(next));
      setRemoved(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    if (action.busy) return;
    if (
      await action.run(async () => {
        const uploaded = file
          ? await uploadImage(profile!.id, report.id, file)
          : undefined;
        const path = uploaded ?? (removed ? null : (report.imagePath ?? null));
        try {
          await editReport(report, { image_path: path });
        } catch (e) {
          await cleanupImage(uploaded);
          throw e;
        }
        if (report.imagePath !== path) await cleanupImage(report.imagePath);
      })
    )
      onClose();
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Chỉnh sửa ảnh"
      footer={
        <>
          <Button variant="ghost" disabled={action.busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            disabled={action.busy}
            onClick={() => {
              void save();
            }}
          >
            {action.busy ? "Đang lưu…" : "Lưu"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <CategoryThumb
          category={categoryById(report.categoryId)}
          imagePath={!removed ? report.imagePath : undefined}
          previewUrl={preview}
          alt={report.itemName}
          className="mx-auto h-48 w-48 rounded-xl"
        />
        <input
          ref={input}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={action.busy}
            onClick={() => input.current?.click()}
          >
            Chọn ảnh
          </Button>
          <Button
            variant="ghost"
            disabled={action.busy}
            onClick={() => {
              setRemoved(true);
              setFile(undefined);
              setPreview(undefined);
            }}
          >
            Xóa ảnh
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          JPEG, PNG hoặc WebP, tối đa 5 MB.
        </p>
        {(error || action.error) && (
          <p role="alert" className="text-sm text-red-700">
            {error || action.error}
          </p>
        )}
      </div>
    </Modal>
  );
}
