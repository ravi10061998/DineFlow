import { useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, ...props }: TextFieldProps) {
  // Falls back to a generated id when neither `id` nor `name` is passed —
  // without this, <label htmlFor> had nothing to point at on many call
  // sites, breaking click-to-focus and screen-reader label association.
  const generatedId = useId();
  const fieldId = id ?? props.name ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={fieldId}
        {...props}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}
