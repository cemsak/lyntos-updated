// Components
export { FeedCard } from './FeedCard';
export { IntelligenceFeed } from './IntelligenceFeed';
export { ContextRail } from './ContextRail';

// Mock Data
export { MOCK_FEED_ITEMS, RAW_MOCK_FEED_ITEMS, getFilteredFeed, sortFeedByScore } from './mockData';

// Types
export {
  type FeedItem,
  type RawFeedItem,
  type FeedCategory,
  type FeedSeverity,
  type FeedScope,
  type FeedImpact,
  type FeedAction,
  type EvidenceRef,
  type EvidenceKind,
  type ActionKind,
  type MaterialityPreset,
  type FeedBuildResult,
  SEVERITY_CONFIG,
  CATEGORY_CONFIG,
  EVIDENCE_KIND_CONFIG,
} from './types';

// Store
export {
  useFeedStore,
  useSelectedCardId,
  useRailOpen,
  useSeverityFilter,
  useResolvedIds,
  useFeedActions,
  syncStoreWithUrl,
  getUrlFromStore,
} from './useFeedStore';

// URL Sync
export { useUrlSync, useCardIdFromUrl, useNavigateToCard, useResetFeedSelection } from './useUrlSync';

// Pipeline
export {
  buildFeed,
  passesExplainability,
  passesMateriality,
  bundleAndDedupe,
  applyDailyLimit,
  filterByStatus,
  getFeedStats,
  MATERIALITY_STANDARD,
  MATERIALITY_CONSERVATIVE,
  MATERIALITY_AGGRESSIVE,
} from './pipeline';
