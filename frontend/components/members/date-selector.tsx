"use client";

type DateSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  max?: string;
  min?: string;
  className?: string;
};

export function DateSelector({
  value,
  onChange,
  label = "Select date",
  max,
  min,
  className = "",
}: DateSelectorProps) {
  return (
    <div className={className}>
      <label
        htmlFor="attendance-date"
        className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
      </label>
      <input
        id="attendance-date"
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </div>
  );
}

export default DateSelector;
