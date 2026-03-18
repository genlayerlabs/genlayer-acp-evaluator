import type { Hash } from "genlayer-js/types";

type RecordEntry = {
  txHash: Hash;
  contractAddress: `0x${string}`;
  finalized: boolean;
  result: unknown;
  updatedAt: string;
};

const records = new Map<string, RecordEntry>();

export function putRecord(jobId: string, value: RecordEntry) {
  records.set(jobId, value);
}

export function getRecord(jobId: string) {
  return records.get(jobId);
}

export function getAllRecords() {
  return Array.from(records.entries()).map(([jobId, record]) => ({
    jobId,
    ...record,
  }));
}

export function updateRecord(jobId: string, partial: Partial<RecordEntry>) {
  const prev = records.get(jobId);
  if (!prev) return;
  records.set(jobId, {
    ...prev,
    ...partial,
    updatedAt: new Date().toISOString(),
  });
}
