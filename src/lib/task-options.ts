/**
 * Opsi prioritas kanonik dari schema (§6.3): satu sumber untuk form tugas
 * dan setelan divisi, sehingga nilai yang dikirim selalu salah satu enum.
 */
import { PRIORITIES, type Priority } from "@/db/schema";

export interface PriorityOption {
  value: Priority;
  label: string;
}

export const PRIORITY_OPTIONS: readonly PriorityOption[] = PRIORITIES.map(
  (value) => ({
    value,
    label:
      value === "RENDAH"
        ? "Rendah"
        : value === "SEDANG"
          ? "Sedang"
          : value === "TINGGI"
            ? "Tinggi"
            : "Mendesak",
  }),
);

export function priorityLabel(value: Priority): string {
  return PRIORITY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
