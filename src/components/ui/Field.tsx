import { cloneElement, isValidElement, useId, type ReactNode } from "react";
import { classNames } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const control =
    isValidElement<{ id?: string }>(children) &&
    typeof children.type === "string" &&
    ["input", "select", "textarea"].includes(children.type)
      ? children
      : null;
  const controlId = htmlFor ?? control?.props.id ?? generatedId;
  return (
    <div className={className}>
      <label htmlFor={controlId} className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {control ? cloneElement(control, { id: controlId }) : children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function InputGroup({ children }: { children: ReactNode }) {
  return (
    <div className={classNames("grid grid-cols-1 gap-4 sm:grid-cols-2")}>
      {children}
    </div>
  );
}
