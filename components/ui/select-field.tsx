import { ChevronDownIcon } from "@heroicons/react/20/solid";
import type { SelectHTMLAttributes } from "react";

type Option = { value: string; label: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Option[];
  placeholder?: string;
};

export function SelectField({
  label,
  options,
  placeholder = "",
  className = "",
  id,
  ...props
}: Props) {
  const selectId = id || props.name || "select";

  return (
    <label className="block text-sm font-medium" htmlFor={selectId}>
      {label}
      <span className="relative mt-1 block">
        <select
          id={selectId}
          className={`w-full appearance-none rounded-md border border-brand/15 bg-white py-2 pr-10 pl-3 outline-none focus:border-brand ${className}`}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-muted"
        />
      </span>
    </label>
  );
}
