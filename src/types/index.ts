// ============================================
// AskVault — Shared TypeScript Types
// ============================================

export type { TenantPlan, UserRole, AuthMode, ConnectorType, SyncStatus, ContentClassification, SourceStatus, ChunkStatus, JobType, JobStatus, FeedbackType, AuditAction } from "@prisma/client";

// Chat types
export interface ChatAPIResponse {
  answer: string;
  sessionId: string;
  messageId: string;
  isGrounded: boolean;
  confidenceScore: number;
  citations: ChatCitation[];
  latencyMs: number;
}

export interface ChatCitation {
  notebookName: string;
  sourceTitle?: string;
  sectionHeading?: string;
}

// Admin API types
export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  plan: string;
  isActive: boolean;
  authMode: string;
  createdAt: string;
  _count: {
    users: number;
    notebookRecords: number;
    chatSessions: number;
  };
}

export interface NotebookSummary {
  id: string;
  displayName: string;
  description?: string;
  slug: string;
  connectorType: string;
  syncStatus: string;
  lastSyncAt?: string;
  classification: string;
  _count: { sourceRecords: number };
  googleAccountConnection?: { googleEmail: string; isActive: boolean };
}

export interface SourceSummary {
  id: string;
  title: string;
  description?: string;
  connectorType: string;
  status: string;
  classification: string;
  wordCount?: number;
  createdAt: string;
  _count: { chunks: number };
}

// Connector types
export interface ConnectorInfo {
  type: string;
  displayName: string;
  description: string;
  requiresGoogle: boolean;
  icon: string;
}
