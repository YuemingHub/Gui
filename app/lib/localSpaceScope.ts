// Participant-scoped persistence for 本地工具: one person's writings live under
// one person's key, and the pre-identity browser-global blob can be taken over
// exactly once. Storage, normalization and the empty state are injected so this
// stays free of React, of the browser global and of the defaults layer.

import type { AppState } from "./types";

export interface LocalSpaceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalSpaceScope {
  /** Reads this participant's own state; unknown participants read nothing. */
  load(participantId: string): AppState;
  save(participantId: string, state: AppState): boolean;
}

export function createLocalSpaceScope(deps: {
  storage: LocalSpaceStorage;
  /** What pre-identity builds saved everyone's state under. */
  legacyKey: string;
  normalize: (raw: unknown) => AppState;
  empty: () => AppState;
}): LocalSpaceScope {
  const { storage, legacyKey, normalize, empty } = deps;

  const scopedKey = (participantId: string): string => `${legacyKey}.${participantId}`;

  /**
   * The legacy blob is removed only after the scoped copy is written, so a
   * failed write leaves it where it was and the claim can be retried; and since
   * it is gone after a successful one, the next person to log in at this browser
   * finds nothing global and starts from their own empty state.
   */
  const claimLegacy = (participantId: string): string | null => {
    const legacy = storage.getItem(legacyKey);
    if (legacy === null) return null;
    storage.setItem(scopedKey(participantId), legacy);
    storage.removeItem(legacyKey);
    return legacy;
  };

  return {
    load(participantId) {
      if (!participantId) return empty();
      try {
        const raw = storage.getItem(scopedKey(participantId)) ?? claimLegacy(participantId);
        return raw ? normalize(JSON.parse(raw)) : empty();
      } catch {
        return empty();
      }
    },

    save(participantId, state) {
      if (!participantId) return false;
      try {
        storage.setItem(scopedKey(participantId), JSON.stringify(state));
        return true;
      } catch {
        return false;
      }
    },
  };
}
