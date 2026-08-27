"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, type, ...props }: TextFieldProps) {
  // Falls back to a generated id when neither `id` nor `name` is passed —
  // without this, <label htmlFor> had nothing to point at on many call
  // sites, breaking click-to-focus and screen-reader label association.
  const generatedId = useId();
  const fieldId = id ?? props.name ?? generatedId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  const input = (
    <input
      id={fieldId}
      type={isPassword && visible ? "text" : type}
      {...props}
      className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500 ${isPassword ? "pr-10" : ""}`}
    />
  );

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      ) : (
        input
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61C3.35 8.42 1 12 1 12s4 8 11 8a9.26 9.26 0 0 0 5.39-1.61M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}
