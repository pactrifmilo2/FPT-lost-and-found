import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, ShieldAlert, Trash2 } from "lucide-react";
import type { CurrentHolder, Report, ReportKind } from "@/types";
import { useAction, useData } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { useReference } from "@/lib/useReference";
import { CURRENT_HOLDER_OPTIONS } from "@/data/reference";
import { uploadImage, cleanupImage, validateImage } from "@/lib/api/storage";
import { createReport, editReport } from "@/lib/api/reports";
import { CategoryThumb } from "./CategoryThumb";
import { toISODate } from "@/lib/utils";
import { COMMON, REPORT_FORM as T } from "@/lib/i18n";
import { Button } from "./ui/Button";
import { Field, InputGroup } from "./ui/Field";

export function ReportForm({
  kind,
  report,
}: {
  kind: ReportKind;
  report?: Report;
}) {
  const navigate = useNavigate();
  const { categories, locations, buildings, locationById, categoryById } =
    useReference();
  const { profile } = useAuth();
  const { claims } = useData();
  const action = useAction();
  const id = useRef(report?.id ?? crypto.randomUUID()).current;
  const [imageFile, setImageFile] = useState<File>();
  const [imageRemoved, setImageRemoved] = useState(false);
  const locked =
    !!report &&
    (["RETURNED", "CLOSED"].includes(report.status) ||
      claims.some(
        (c) =>
          (c.foundItemId === report.id || c.lostItemId === report.id) &&
          ["UNDER_REVIEW", "APPROVED", "COMPLETED"].includes(c.status),
      ));

  const [itemName, setItemName] = useState(report?.itemName ?? "");
  const [categoryId, setCategoryId] = useState(report?.categoryId ?? "");
  const [description, setDescription] = useState(report?.description ?? "");
  const [date, setDate] = useState(report?.date ?? toISODate(new Date()));
  const [time, setTime] = useState(report?.time ?? "");
  const [locationId, setLocationId] = useState(report?.locationId ?? "");
  const [building, setBuilding] = useState(report?.building ?? "");
  const [floorRoom, setFloorRoom] = useState(
    report?.kind === "lost" ? report.floorRoom : "",
  );
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();

  // Lost-only
  const [distinguishing, setDistinguishing] = useState(
    report?.kind === "lost" ? report.distinguishingCharacteristics : "",
  );
  const [contact, setContact] = useState(
    report?.kind === "lost" ? report.contactPreference : "",
  );
  // Found-only
  const [currentHolder, setCurrentHolder] = useState<CurrentHolder>(
    report?.kind === "found" ? report.currentHolder : "security-desk",
  );
  const [privateInfo, setPrivateInfo] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (imageDataUrl) URL.revokeObjectURL(imageDataUrl);
    },
    [imageDataUrl],
  );

  const isLost = kind === "lost";
  const locationName = locationById(locationId)?.name;

  function pickLocation(id: string) {
    setLocationId(id);
    const loc = locationById(id);
    if (loc && loc.kind === "building") setBuilding(loc.name);
  }

  async function pickImage(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      validateImage(file);
      setImageFile(file);
      setImageRemoved(false);
      setImageDataUrl(URL.createObjectURL(file));
    } catch (e) {
      setErrors((p) => ({
        ...p,
        image: e instanceof Error ? e.message : T.readImageError,
      }));
    } finally {
      setBusy(false);
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!itemName.trim()) next.itemName = T.itemNameRequired;
    if (!categoryId) next.categoryId = T.categoryRequired;
    if (!description.trim()) next.description = T.descriptionRequired;
    if (!locationId) next.locationId = T.locationRequired;
    if (!date) next.date = T.dateRequired;
    if (isLost) {
      if (!distinguishing.trim())
        next.distinguishing = T.distinguishingRequired;
      if (!contact.trim()) next.contact = T.contactRequired;
    } else {
      if (!report && !privateInfo.trim())
        next.privateInfo = T.privateInfoRequired;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate() || locked || busy || action.busy) return;
    const saved = await action.run(async () => {
      const newPath = imageFile
        ? await uploadImage(profile!.id, id, imageFile)
        : undefined;
      const imagePath =
        newPath ?? (imageRemoved ? null : (report?.imagePath ?? null));
      const data = {
        item_name: itemName.trim(),
        category_id: categoryId,
        description: description.trim(),
        date,
        time: time || null,
        location_id: locationId,
        building,
        floor_room: floorRoom.trim(),
        image_path: imagePath,
        ...(isLost
          ? {
              distinguishing_characteristics: distinguishing.trim(),
              contact_preference: contact.trim(),
            }
          : { current_holder: currentHolder }),
      };
      try {
        if (report)
          await editReport(report, data, privateInfo.trim() || undefined);
        else
          await createReport(
            id,
            { ...data, kind },
            privateInfo.trim() || undefined,
          );
      } catch (e) {
        await cleanupImage(newPath);
        throw e;
      }
      if (report?.imagePath && report.imagePath !== imagePath)
        await cleanupImage(report.imagePath);
    });
    if (saved)
      navigate(`/items/${id}`, {
        state: { justCreated: !report, justEdited: !!report },
      });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="card space-y-6 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {T.itemDetails}
          </h2>
          <p className="text-sm text-slate-500">{T.itemDetailsHint}</p>
        </div>

        <InputGroup>
          <Field
            label={T.itemName}
            htmlFor="itemName"
            required
            error={errors.itemName}
          >
            <input
              id="itemName"
              className="input"
              placeholder={T.itemNamePlaceholder}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </Field>
          <Field
            label={T.category}
            htmlFor="category"
            required
            error={errors.categoryId}
          >
            <select
              id="category"
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{T.selectCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </Field>
        </InputGroup>

        <Field
          label={T.description}
          htmlFor="description"
          required
          error={errors.description}
          hint={isLost ? T.descriptionHintLost : T.descriptionHintFound}
        >
          <textarea
            id="description"
            className="input min-h-[96px] resize-y"
            placeholder={T.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <InputGroup>
          <Field
            label={isLost ? T.dateLost : T.dateFound}
            htmlFor="date"
            required
            error={errors.date}
          >
            <input
              id="date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label={T.time} htmlFor="time" hint={COMMON.optional}>
            <input
              id="time"
              type="time"
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </InputGroup>

        <InputGroup>
          <Field
            label={T.campusLocation}
            htmlFor="location"
            required
            error={errors.locationId}
          >
            <select
              id="location"
              className="input"
              value={locationId}
              onChange={(e) => pickLocation(e.target.value)}
            >
              <option value="">{T.selectLocation}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={T.building} htmlFor="building" hint={COMMON.optional}>
            <select
              id="building"
              className="input"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            >
              <option value="">{T.selectBuilding}</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
        </InputGroup>

        <Field
          label={isLost ? T.floorRoomLost : T.floorRoomFound}
          htmlFor="floorRoom"
          hint={T.floorRoomHint}
        >
          <input
            id="floorRoom"
            className="input"
            placeholder={T.floorRoomPlaceholder}
            value={floorRoom}
            onChange={(e) => setFloorRoom(e.target.value)}
          />
        </Field>

        <Field label={T.photo} hint={T.photoHint} error={errors.image}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          {imageDataUrl || (!imageRemoved && report?.imagePath) ? (
            <div className="flex items-center gap-3">
              <CategoryThumb
                category={categoryById(categoryId)}
                previewUrl={imageDataUrl}
                imagePath={!imageRemoved ? report?.imagePath : undefined}
                alt={T.photo}
                className="h-20 w-20 rounded-xl"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  {COMMON.replace}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImageDataUrl(undefined);
                    setImageFile(undefined);
                    setImageRemoved(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {COMMON.remove}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" />
              {busy ? COMMON.processing : T.uploadPhoto}
            </button>
          )}
        </Field>
      </div>

      {isLost ? (
        <div className="card space-y-6 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {T.ownership}
            </h2>
            <p className="text-sm text-slate-500">{T.ownershipHint}</p>
          </div>
          <Field
            label={T.distinguishing}
            htmlFor="distinguishing"
            required
            error={errors.distinguishing}
            hint={T.distinguishingHint}
          >
            <textarea
              id="distinguishing"
              className="input min-h-[80px] resize-y"
              placeholder={T.distinguishingPlaceholder}
              value={distinguishing}
              onChange={(e) => setDistinguishing(e.target.value)}
            />
          </Field>
          <Field
            label={T.contact}
            htmlFor="contact"
            required
            error={errors.contact}
            hint={T.contactHint}
          >
            <input
              id="contact"
              className="input"
              placeholder={T.contactPlaceholder}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </Field>
        </div>
      ) : (
        <div className="card space-y-6 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {T.foundDetails}
            </h2>
            <p className="text-sm text-slate-500">{T.foundDetailsHint}</p>
          </div>
          <Field label={T.currentHolder} htmlFor="holder" required>
            <select
              id="holder"
              className="input"
              value={currentHolder}
              onChange={(e) =>
                setCurrentHolder(e.target.value as CurrentHolder)
              }
            >
              {CURRENT_HOLDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={T.privateInfo}
            htmlFor="privateInfo"
            required={!report}
            error={errors.privateInfo}
            hint={
              report
                ? "Để trống để giữ thông tin đã lưu; chỉ quản trị viên được đọc. Nhập nội dung mới để thay thế."
                : T.privateInfoHint
            }
          >
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{T.privateInfoNote}</span>
            </div>
            <textarea
              id="privateInfo"
              className="input mt-3 min-h-[80px] resize-y"
              placeholder={T.privateInfoPlaceholder}
              value={privateInfo}
              onChange={(e) => setPrivateInfo(e.target.value)}
            />
          </Field>
        </div>
      )}

      {action.error && (
        <p role="alert" className="text-sm text-red-700">
          {action.error}
        </p>
      )}
      {locked && (
        <p role="alert" className="text-sm text-amber-700">
          Không thể sửa tin khi đang xác minh, đã đóng hoặc đã bàn giao.
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          {T.submittingAs}{" "}
          <span className="font-medium text-slate-600">
            {profile!.fullName}
          </span>{" "}
          · {locationName ?? T.campusFallback}
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={busy || action.busy || locked}
        >
          {action.busy
            ? "Đang lưu…"
            : report
              ? "Lưu thay đổi"
              : isLost
                ? T.submitLost
                : T.submitFound}
        </Button>
      </div>
    </form>
  );
}
