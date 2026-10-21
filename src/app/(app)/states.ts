/**
 * Ekspor gabungan untuk empat komponen keadaan (state) antarmuka.
 * Mengacu pada lembar wireframe state-kosong, state-galat, state-memuat, dan state-403.
 */
export { default as EmptyState } from "./empty-state";
export type {
  EmptyStateProps,
  EmptyStateAction,
  EmptyStateIllustration,
} from "./empty-state";

export { default as ErrorState, ErrorBanner, FieldError } from "./error-state";
export type { ErrorStateProps, ErrorBannerProps } from "./error-state";

export {
  Skeleton,
  TableSkeleton,
  KpiStripSkeleton,
  LoadingButton,
} from "./loading-state";
export type {
  SkeletonProps,
  TableSkeletonProps,
  KpiStripSkeletonProps,
  LoadingButtonProps,
} from "./loading-state";

export { default as ForbiddenState } from "./forbidden-state";
export type { ForbiddenStateProps } from "./forbidden-state";
