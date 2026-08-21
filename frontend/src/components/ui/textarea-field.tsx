import { useId, type TextareaHTMLAttributes } from "react";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function TextAreaField({ label, id, ...props }: TextAreaFieldProps) {
  // Same id-fallback pattern as TextField — <label htmlFor> needs something to point at.
  const generatedId = useId();
  const fieldId = id ?? props.name ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={fieldId}
        {...props}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}
