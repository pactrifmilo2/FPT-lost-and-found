import type { Category } from "@/types";
import { classNames } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { signImage } from "@/lib/api/storage";

export function CategoryThumb({
  category,
  imagePath,
  previewUrl,
  alt,
  className,
  iconClassName = "text-2xl",
}: {
  category: Category;
  imagePath?: string;
  previewUrl?: string;
  alt?: string;
  className?: string;
  iconClassName?: string;
}) {
  const { profile } = useAuth();
  const query = useQuery({
    queryKey: ["image", profile?.id, profile?.role, imagePath],
    queryFn: () => signImage(imagePath!),
    enabled: !!imagePath,
    staleTime: 240_000,
    refetchInterval: 240_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const [failed, setFailed] = useState<string>();
  const url = previewUrl ?? query.data;
  if (url && failed !== url) {
    return (
      <img
        src={url}
        onError={() => {
          setFailed(url);
          if (!previewUrl) void query.refetch();
        }}
        alt={alt ?? category.name}
        className={classNames("shrink-0 object-cover", className)}
      />
    );
  }
  return (
    <div
      className={classNames(
        "relative flex shrink-0 select-none items-center justify-center overflow-hidden",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${category.color}, ${category.color}88)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 28% 18%, rgba(255,255,255,0.32), transparent 62%)",
        }}
      />
      <span className={classNames("relative drop-shadow-sm", iconClassName)}>
        {category.emoji}
      </span>
      {imagePath && (query.error || failed === url) && (
        <button
          type="button"
          className="absolute bottom-1 rounded bg-white/90 px-1 text-xs text-slate-700"
          onClick={(e) => {
            e.preventDefault();
            void query.refetch().then(() => setFailed(undefined));
          }}
        >
          Tải lại ảnh
        </button>
      )}
    </div>
  );
}
