import { Icon, type IconName } from "../icons";

export type StatCardTone = "normal" | "warning" | "danger" | "success";

const TONE_STYLES: Record<
  StatCardTone,
  {
    border: string;
    text: string;
    badge?: string;
  }
> = {
  normal: {
    border: "border-border hover:border-border-strong",
    text: "text-ink",
  },
  warning: {
    border: "border-warning/60 bg-warning-surface/20 hover:border-warning",
    text: "text-warning",
    badge: "text-warning bg-warning-surface",
  },
  danger: {
    border: "border-error/60 bg-error-surface/20 hover:border-error",
    text: "text-error",
    badge: "text-error bg-error-surface",
  },
  success: {
    border: "border-success/60 bg-success-surface/20 hover:border-success",
    text: "text-success",
    badge: "text-success bg-success-surface",
  },
};

export default function StatCard({
  label,
  value,
  unit,
  tone = "normal",
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  unit?: string;
  tone?: StatCardTone;
  hint?: string;
  icon?: IconName;
}) {
  const style = TONE_STYLES[tone];

  return (
    <div
      className={`card flex flex-col justify-between border p-4 transition-all duration-[120ms] hover:shadow-card-hover ${style.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="label font-medium text-ink-2">{label}</p>
        {icon ? (
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
              style.badge ?? "bg-neutral-surface text-ink-3"
            }`}
          >
            <Icon name={icon} size={14} />
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        <p className={`text-kpi font-semibold tabular-nums tracking-tight ${style.text}`}>
          {value}
          {unit ? (
            <span className="ml-1.5 text-body-sm font-normal text-ink-3">
              {unit}
            </span>
          ) : null}
        </p>
        {hint ? (
          <p className="mt-1 text-body-sm text-ink-3 leading-snug">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
