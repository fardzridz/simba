import type { AssignmentStatus } from "@/db/schema";
import { STATUS_ICON, STATUS_LABEL } from "@/lib/status-view";
import { Icon } from "../icons";

const CHIP: Record<AssignmentStatus, string> = {
  BELUM_DIKERJAKAN: "bg-status-belum-surface text-status-belum-text",
  SEDANG_DIKERJAKAN: "bg-status-sedang-surface text-status-sedang-text",
  MENUNGGU_VERIFIKASI: "bg-status-menunggu-surface text-status-menunggu-text",
  SELESAI: "bg-status-selesai-surface text-status-selesai-text",
  DIBATALKAN: "bg-status-dibatalkan-surface text-status-dibatalkan-text",
};

export default function StatusChip({ status }: { status: AssignmentStatus }) {
  return (
    <span className={`inline-flex h-[22px] items-center gap-1 rounded-sm px-2 text-label ${CHIP[status]}`}>
      <Icon name={STATUS_ICON[status]} size={12} />
      {STATUS_LABEL[status]}
    </span>
  );
}
