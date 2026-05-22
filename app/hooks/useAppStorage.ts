"use client";

import { useEffect, useMemo, useState } from "react";
import { createInitialState } from "@/app/lib/defaults";
import {
  exportStateToJson,
  importStateFromJson,
  loadStateFromStorage,
  saveStateToStorage,
} from "@/app/lib/storage";
import type { AppState } from "@/app/lib/types";

const createTimeLabel = () =>
  new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

export function useAppStorage() {
  const [state, setState] = useState<AppState>(() => createInitialState());
  const [loaded, setLoaded] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setState(loadStateFromStorage());
        setStatusMessage("");
      } catch {
        setState(createInitialState());
        setStatusMessage("本地数据读取失败，已回退到默认状态。");
      } finally {
        setLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const timer = window.setTimeout(() => {
      const saved = saveStateToStorage(state);
      if (saved) {
        setLastSavedAt(createTimeLabel());
        setStatusMessage("");
        return;
      }

      setStatusMessage("本地保存失败，但页面仍可继续使用。");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loaded, state]);

  const dismissOnboarding = () => {
    setState((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        onboardingDismissed: true,
      },
    }));
  };

  const reopenOnboarding = () => {
    setState((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        onboardingDismissed: false,
      },
    }));
  };

  const resetState = () => {
    const next = createInitialState();
    setState(next);
    setStatusMessage("已回到初始状态。你可以重新慢慢开始。");
    setLastSavedAt(createTimeLabel());
  };

  const importState = async (file: File) => {
    try {
      const raw = await file.text();
      const next = importStateFromJson(raw);
      setState(next);
      setStatusMessage("已导入这份本地备份。");
      setLastSavedAt(createTimeLabel());
      return { ok: true as const, message: "已导入这份本地备份。" };
    } catch {
      const message = "这份文件无法识别，当前数据没有被改动。";
      setStatusMessage(message);
      return { ok: false as const, message };
    }
  };

  const exportState = () => {
    try {
      const json = exportStateToJson(state);
      const blob = new Blob([json], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `huidaoziji-backup-${stamp}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setStatusMessage("已导出一份本地备份。");
      setLastSavedAt(createTimeLabel());
      return { ok: true as const, message: "已导出一份本地备份。" };
    } catch {
      const message = "导出失败，但当前内容仍然保留在本机浏览器里。";
      setStatusMessage(message);
      return { ok: false as const, message };
    }
  };

  const saveMessage = useMemo(() => {
    if (!loaded) return "正在安静加载…";
    if (statusMessage) return statusMessage;
    if (!lastSavedAt) return "已准备好。";
    return `已安静保存 · ${lastSavedAt}`;
  }, [lastSavedAt, loaded, statusMessage]);

  return {
    state,
    setState,
    mounted: loaded,
    saveMessage,
    storageWarning: statusMessage,
    dismissOnboarding,
    reopenOnboarding,
    resetState,
    importState,
    exportState,
  };
}
