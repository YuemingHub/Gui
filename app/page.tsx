"use client";

import { useAppStorage } from "@/app/hooks/useAppStorage";
import type { AppState, SectionId } from "@/app/lib/types";
import { AppShell } from "@/components/layout/AppShell";
import { ClearingRoom } from "@/components/sections/ClearingRoom";
import { GardenSection } from "@/components/sections/GardenSection";
import { HomeSection } from "@/components/sections/HomeSection";
import { MonthlyReview } from "@/components/sections/MonthlyReview";
import { RhythmSection } from "@/components/sections/RhythmSection";
import { SilenceCabin } from "@/components/sections/SilenceCabin";
import { TruthWorkshop } from "@/components/sections/TruthWorkshop";

const updateState = <K extends keyof AppState>(
  state: AppState,
  key: K,
  value: AppState[K],
): AppState => ({
  ...state,
  [key]: value,
});

export default function Page() {
  const { state, setState, saveMessage, resetState, importState, exportState } = useAppStorage();

  const renderSection = (section: SectionId) => {
    switch (section) {
      case "home":
        return (
          <HomeSection
            daily={state.daily}
            onChange={(daily) => setState((current) => updateState(current, "daily", daily))}
          />
        );
      case "truths":
        return (
          <TruthWorkshop
            truths={state.truths}
            onChange={(truths) => setState((current) => updateState(current, "truths", truths))}
          />
        );
      case "clearings":
        return (
          <ClearingRoom
            clearings={state.clearings}
            onChange={(clearings) =>
              setState((current) => updateState(current, "clearings", clearings))
            }
          />
        );
      case "boundaries":
        return (
          <SilenceCabin
            boundaries={state.boundaries}
            onChange={(boundaries) =>
              setState((current) => updateState(current, "boundaries", boundaries))
            }
          />
        );
      case "rhythm":
        return (
          <RhythmSection
            rhythm={state.rhythm}
            onChange={(rhythm) => setState((current) => updateState(current, "rhythm", rhythm))}
          />
        );
      case "garden":
        return (
          <GardenSection
            items={state.gardenItems}
            truths={state.truths}
            onChange={(gardenItems) =>
              setState((current) => updateState(current, "gardenItems", gardenItems))
            }
          />
        );
      case "monthly":
        return (
          <MonthlyReview
            items={state.monthlyReviews}
            onChange={(monthlyReviews) =>
              setState((current) => updateState(current, "monthlyReviews", monthlyReviews))
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppShell
      saveMessage={saveMessage}
      onExport={exportState}
      onImport={importState}
      onReset={resetState}
    >
      {renderSection}
    </AppShell>
  );
}
