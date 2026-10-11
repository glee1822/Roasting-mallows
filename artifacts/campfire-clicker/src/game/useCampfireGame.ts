import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CampfireState,
  RoastPhase,
  RoastState,
  Upgrade,
} from "./gameTypes";

const SAVE_KEY = "campfire-clicker-save-v1";
const SAVE_VERSION = 1;
const TICK_MS = 1000;
const SAVE_INTERVAL_MS = 2500;
const ROAST_MIN_SECONDS = 1;
const ROAST_GOLDEN_START = 2.3;
const ROAST_GOLDEN_END = 2.5;
const ROAST_BURN_SECONDS = 2.5;

interface PersistedGame {
  marshmallows: number;
  sticks: number;
  mpr: number;
  friends: number;
  friendMpr: number;
  activeSeconds: number;
  goldenFriends: boolean;
  purchases: Record<string, number>;
}

interface SaveFile {
  game: PersistedGame;
  savedAt: number;
  musicEnabled: boolean;
  version: number;
}

interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  amount: number;
  category: "player" | "friends";
  prerequisiteId?: string;
  prerequisiteCount?: number;
  oneTime?: boolean;
}

const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "mpr-1",
    name: "+1 marshmallow per roast",
    description: "Roast one more marshmallow each time.",
    baseCost: 20,
    amount: 1,
    category: "player",
  },
  {
    id: "mpr-10",
    name: "+10 marshmallows per roast",
    description: "A bigger handful for every roast.",
    baseCost: 150,
    amount: 10,
    category: "player",
    prerequisiteId: "mpr-1",
  },
  {
    id: "mpr-50",
    name: "+50 marshmallows per roast",
    description: "Fill a whole bundle at once.",
    baseCost: 400,
    amount: 50,
    category: "player",
    prerequisiteId: "mpr-10",
  },
  {
    id: "mpr-100",
    name: "+100 marshmallows per roast",
    description: "Make every carefully timed roast count.",
    baseCost: 800,
    amount: 100,
    category: "player",
    prerequisiteId: "mpr-50",
  },
  {
    id: "mpr-500",
    name: "+500 marshmallows per roast",
    description: "A campfire feast in one perfect roast.",
    baseCost: 4000,
    amount: 500,
    category: "player",
    prerequisiteId: "mpr-100",
  },
  {
    id: "sticks-1",
    name: "One roasting stick",
    description: "Adds room for 5 more marshmallows per roast.",
    baseCost: 50,
    amount: 1,
    category: "player",
  },
  {
    id: "sticks-5",
    name: "Five roasting sticks",
    description: "Adds room for 25 more marshmallows per roast.",
    baseCost: 200,
    amount: 5,
    category: "player",
    prerequisiteId: "sticks-1",
  },
  {
    id: "sticks-10",
    name: "Ten roasting sticks",
    description: "Adds room for 50 more marshmallows per roast.",
    baseCost: 450,
    amount: 10,
    category: "player",
    prerequisiteId: "sticks-5",
  },
  {
    id: "sticks-50",
    name: "Fifty roasting sticks",
    description: "Adds room for 250 more marshmallows per roast.",
    baseCost: 2000,
    amount: 50,
    category: "player",
    prerequisiteId: "sticks-10",
  },
  {
    id: "sticks-100",
    name: "One hundred roasting sticks",
    description: "Adds room for 500 more marshmallows per roast.",
    baseCost: 4500,
    amount: 100,
    category: "player",
    prerequisiteId: "sticks-50",
  },
  {
    id: "friends-1",
    name: "Invite one friend",
    description: "A new friend joins the fire and roasts automatically.",
    baseCost: 50,
    amount: 1,
    category: "friends",
  },
  {
    id: "friends-5",
    name: "Invite five friends",
    description: "Bring a few more friends to the campfire.",
    baseCost: 200,
    amount: 5,
    category: "friends",
    prerequisiteId: "friends-1",
  },
  {
    id: "friends-10",
    name: "Invite ten friends",
    description: "Make room for a larger campfire circle.",
    baseCost: 450,
    amount: 10,
    category: "friends",
    prerequisiteId: "friends-5",
  },
  {
    id: "friends-50",
    name: "Invite fifty friends",
    description: "A whole gathering joins the roasting.",
    baseCost: 2000,
    amount: 50,
    category: "friends",
    prerequisiteId: "friends-10",
  },
  {
    id: "friends-100",
    name: "Invite one hundred friends",
    description: "Turn the campsite into a festival.",
    baseCost: 4500,
    amount: 100,
    category: "friends",
    prerequisiteId: "friends-50",
  },
  {
    id: "friend-mpr-1",
    name: "+1 marshmallow per friend each second",
    description: "Every friend roasts one more marshmallow per second.",
    baseCost: 30,
    amount: 1,
    category: "friends",
  },
  {
    id: "friend-mpr-10",
    name: "+10 marshmallows per friend each second",
    description: "Every friend roasts ten more marshmallows per second.",
    baseCost: 225,
    amount: 10,
    category: "friends",
    prerequisiteId: "friend-mpr-1",
  },
  {
    id: "friend-mpr-50",
    name: "+50 marshmallows per friend each second",
    description: "Every friend roasts fifty more marshmallows per second.",
    baseCost: 600,
    amount: 50,
    category: "friends",
    prerequisiteId: "friend-mpr-10",
  },
  {
    id: "friend-mpr-100",
    name: "+100 marshmallows per friend each second",
    description: "Every friend roasts one hundred more marshmallows per second.",
    baseCost: 1200,
    amount: 100,
    category: "friends",
    prerequisiteId: "friend-mpr-50",
  },
  {
    id: "friend-mpr-500",
    name: "+500 marshmallows per friend each second",
    description: "Every friend roasts five hundred more marshmallows per second.",
    baseCost: 6000,
    amount: 500,
    category: "friends",
    prerequisiteId: "friend-mpr-100",
  },
  {
    id: "golden-friends",
    name: "Golden-roast lessons",
    description: "Friends learn to make golden marshmallows. Doubles all friend production.",
    baseCost: 1_000_000,
    amount: 1,
    category: "friends",
    prerequisiteId: "friends-100",
    prerequisiteCount: 25,
    oneTime: true,
  },
];

const UPGRADE_BY_ID = new Map(
  UPGRADE_DEFINITIONS.map((upgrade) => [upgrade.id, upgrade]),
);

function createNewGame(): PersistedGame {
  return {
    marshmallows: 0,
    sticks: 1,
    mpr: 1,
    friends: 0,
    friendMpr: 1,
    activeSeconds: 0,
    goldenFriends: false,
    purchases: {},
  };
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validatePersistedGame(value: unknown): value is PersistedGame {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<PersistedGame>;
  if (
    !isFiniteNonNegative(game.marshmallows) ||
    !Number.isSafeInteger(game.sticks) ||
    !isFiniteNonNegative(game.sticks) ||
    !Number.isSafeInteger(game.mpr) ||
    !isFiniteNonNegative(game.mpr) ||
    !Number.isSafeInteger(game.friends) ||
    !isFiniteNonNegative(game.friends) ||
    !Number.isSafeInteger(game.friendMpr) ||
    !isFiniteNonNegative(game.friendMpr) ||
    !isFiniteNonNegative(game.activeSeconds) ||
    typeof game.goldenFriends !== "boolean" ||
    !game.purchases ||
    typeof game.purchases !== "object" ||
    Array.isArray(game.purchases)
  ) {
    return false;
  }

  if (game.mpr > game.sticks * 5) return false;

  return Object.entries(game.purchases).every(
    ([id, count]) =>
      UPGRADE_BY_ID.has(id) &&
      Number.isSafeInteger(count) &&
      typeof count === "number" &&
      count >= 0,
  );
}

function calculateMps(game: PersistedGame): number {
  return game.friends * game.friendMpr * (game.goldenFriends ? 2 : 1);
}

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function savedGame(game: PersistedGame, musicEnabled: boolean): SaveFile {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    musicEnabled,
    game: {
      ...game,
      purchases: { ...game.purchases },
    },
  };
}

function loadLocalGame(): {
  game: PersistedGame;
  offlineEarnings: number;
  savedAt: number;
  musicEnabled: boolean;
} {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return {
        game: createNewGame(),
        offlineEarnings: 0,
        savedAt: now,
        musicEnabled: false,
      };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid save");
    const save = parsed as Partial<SaveFile>;
    if (
      save.version !== SAVE_VERSION ||
      !isFiniteNonNegative(save.savedAt) ||
      !validatePersistedGame(save.game)
    ) {
      throw new Error("Invalid save");
    }

    const secondsAway = Math.max(0, (now - save.savedAt) / 1000);
    const earnings = rounded(calculateMps(save.game) * secondsAway);
    const game = {
      ...save.game,
      marshmallows: rounded(save.game.marshmallows + earnings),
      activeSeconds: rounded(save.game.activeSeconds + secondsAway),
      purchases: { ...save.game.purchases },
    };

    return {
      game,
      offlineEarnings: earnings,
      savedAt: now,
      musicEnabled: save.musicEnabled === true,
    };
  } catch {
    return {
      game: createNewGame(),
      offlineEarnings: 0,
      savedAt: now,
      musicEnabled: false,
    };
  }
}

function createUpgradeViews(game: PersistedGame): Upgrade[] {
  const capacity = game.sticks * 5;
  return UPGRADE_DEFINITIONS.map((definition) => {
    const purchased = game.purchases[definition.id] ?? 0;
    const prerequisiteCount = definition.prerequisiteCount ?? 10;
    const unlocked = definition.prerequisiteId
      ? (game.purchases[definition.prerequisiteId] ?? 0) >=
        prerequisiteCount
      : true;
    const cost = Math.ceil(
      definition.baseCost * Math.pow(1.25, purchased),
    );
    const enoughCapacity =
      !definition.id.startsWith("mpr-") ||
      game.mpr + definition.amount <= capacity;
    const oneTimeAvailable =
      !definition.oneTime || !game.goldenFriends;

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      cost,
      amount: definition.amount,
      purchased,
      unlocked,
      affordable:
        unlocked &&
        oneTimeAvailable &&
        enoughCapacity &&
        game.marshmallows >= cost,
      category: definition.category,
    };
  });
}

function makeMusic(enabled: boolean): AudioContext | null {
  if (
    !enabled ||
    typeof window === "undefined" ||
    typeof window.AudioContext === "undefined"
  ) {
    return null;
  }

  try {
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.035;
    master.connect(context.destination);

    const lowNote = context.createOscillator();
    lowNote.type = "sine";
    lowNote.frequency.value = 110;
    const lowGain = context.createGain();
    lowGain.gain.value = 0.45;
    lowNote.connect(lowGain);
    lowGain.connect(master);
    lowNote.start();

    const highNote = context.createOscillator();
    highNote.type = "sine";
    highNote.frequency.value = 164.81;
    const highGain = context.createGain();
    highGain.gain.value = 0.22;
    highNote.connect(highGain);
    highGain.connect(master);
    highNote.start();

    return context;
  } catch {
    return null;
  }
}

export function useCampfireGame() {
  const [initial] = useState(loadLocalGame);
  const [state, setState] = useState<PersistedGame>(initial.game);
  const stateRef = useRef(state);
  const [offlineEarnings, setOfflineEarnings] = useState(
    initial.offlineEarnings,
  );
  const [lastSavedAt, setLastSavedAt] = useState(initial.savedAt);
  const [musicEnabled, setMusicEnabledValue] = useState(initial.musicEnabled);
  const [roast, setRoast] = useState<RoastState>({
    progress: 0,
    phase: "idle",
    lastAward: 0,
  });
  const lastSimulationAt = useRef(Date.now());
  const roastStartedAt = useRef<number | null>(null);
  const roastResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const musicSetting = useRef(musicEnabled);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const writeSave = useCallback((game: PersistedGame) => {
    const now = Date.now();
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(savedGame(game, musicSetting.current)),
      );
      setLastSavedAt(now);
    } catch {
      // The in-memory game stays playable if local storage is unavailable.
    }
  }, []);

  const updateGame = useCallback(
    (updater: (current: PersistedGame) => PersistedGame) => {
      const next = updater(stateRef.current);
      stateRef.current = next;
      setState(next);
      return next;
    },
    [],
  );

  useEffect(() => {
    writeSave(stateRef.current);
    const saveTimer = window.setInterval(
      () => writeSave(stateRef.current),
      SAVE_INTERVAL_MS,
    );
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") writeSave(stateRef.current);
    };
    const saveBeforeLeaving = () => writeSave(stateRef.current);

    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener("pagehide", saveBeforeLeaving);
    window.addEventListener("beforeunload", saveBeforeLeaving);
    return () => {
      window.clearInterval(saveTimer);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("pagehide", saveBeforeLeaving);
      window.removeEventListener("beforeunload", saveBeforeLeaving);
      writeSave(stateRef.current);
    };
  }, [writeSave]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const seconds = Math.max(0, (now - lastSimulationAt.current) / 1000);
      lastSimulationAt.current = now;
      if (seconds <= 0) return;

      updateGame((current) => ({
        ...current,
        marshmallows: rounded(
          current.marshmallows + calculateMps(current) * seconds,
        ),
        activeSeconds: rounded(current.activeSeconds + seconds),
      }));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [updateGame]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const startedAt = roastStartedAt.current;
      if (startedAt === null) return;
      const elapsed = Math.max(0, (performance.now() - startedAt) / 1000);
      const phase: RoastPhase =
        elapsed >= ROAST_BURN_SECONDS
          ? "burnt"
          : elapsed >= ROAST_GOLDEN_START
            ? "golden"
            : elapsed >= ROAST_MIN_SECONDS
              ? "normal"
              : "roasting";
      setRoast((current) => ({
        ...current,
        progress: Math.min(1, elapsed / ROAST_BURN_SECONDS),
        phase,
      }));
    }, 50);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    musicSetting.current = musicEnabled;
    if (audioContext.current && !musicEnabled) {
      void audioContext.current.close();
      audioContext.current = null;
    }
    if (musicEnabled && !audioContext.current) {
      audioContext.current = makeMusic(true);
      if (audioContext.current?.state === "suspended") {
        void audioContext.current.resume();
      }
    }
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SaveFile;
        parsed.musicEnabled = musicEnabled;
        localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
      }
    } catch {
      // Saving the sound preference is best effort; game progress is separate.
    }
  }, [musicEnabled]);

  useEffect(
    () => () => {
      if (audioContext.current) void audioContext.current.close();
      if (roastResetTimer.current) clearTimeout(roastResetTimer.current);
    },
    [],
  );

  const startRoast = useCallback(() => {
    if (roastStartedAt.current !== null) return;
    if (roastResetTimer.current) clearTimeout(roastResetTimer.current);
    roastStartedAt.current = performance.now();
    setRoast({ progress: 0, phase: "roasting", lastAward: 0 });
  }, []);

  const releaseRoast = useCallback(() => {
    const startedAt = roastStartedAt.current;
    if (startedAt === null) return;
    roastStartedAt.current = null;
    const elapsed = Math.max(0, (performance.now() - startedAt) / 1000);
    let phase: RoastPhase;
    let multiplier = 0;

    if (elapsed < ROAST_MIN_SECONDS) {
      phase = "early";
    } else if (elapsed >= ROAST_GOLDEN_START && elapsed <= ROAST_GOLDEN_END) {
      phase = "golden";
      multiplier = 2;
    } else if (elapsed < ROAST_GOLDEN_START) {
      phase = "normal";
      multiplier = 1;
    } else {
      phase = "burnt";
    }

    const award = multiplier
      ? stateRef.current.mpr * multiplier
      : 0;
    if (award > 0) {
      updateGame((current) => ({
        ...current,
        marshmallows: rounded(current.marshmallows + award),
      }));
    }
    setRoast({
      progress: Math.min(1, elapsed / ROAST_BURN_SECONDS),
      phase,
      lastAward: award,
    });
    if (roastResetTimer.current) clearTimeout(roastResetTimer.current);
    roastResetTimer.current = setTimeout(() => {
      setRoast((current) =>
        current.phase === "roasting"
          ? current
          : { progress: 0, phase: "idle", lastAward: current.lastAward },
      );
    }, 1400);
  }, [updateGame]);

  const buyUpgrade = useCallback(
    (id: string) => {
      const definition = UPGRADE_BY_ID.get(id);
      if (!definition) return;

      const current = stateRef.current;
      const view = createUpgradeViews(current).find((upgrade) => upgrade.id === id);
      if (!view?.affordable) return;

      const next = {
        ...current,
        marshmallows: rounded(current.marshmallows - view.cost),
        purchases: {
          ...current.purchases,
          [id]: (current.purchases[id] ?? 0) + 1,
        },
      };

      if (id === "golden-friends") {
        next.goldenFriends = true;
      } else if (id.startsWith("mpr-")) {
        next.mpr += definition.amount;
      } else if (id.startsWith("sticks-")) {
        next.sticks += definition.amount;
      } else if (id.startsWith("friends-")) {
        next.friends += definition.amount;
      } else if (id.startsWith("friend-mpr-")) {
        next.friendMpr += definition.amount;
      }

      const normalized = {
        ...next,
        mpr: Math.min(next.mpr, next.sticks * 5),
      };
      updateGame(() => normalized);
      writeSave(normalized);
    },
    [updateGame, writeSave],
  );

  const setMusicEnabled = useCallback((enabled: boolean) => {
    setMusicEnabledValue(enabled);
  }, []);

  const exportSave = useCallback(() => {
    const now = Date.now();
    const save: SaveFile = {
      version: SAVE_VERSION,
      savedAt: now,
      musicEnabled: musicSetting.current,
      game: {
        ...stateRef.current,
        purchases: { ...stateRef.current.purchases },
      },
    };
    const serialized = JSON.stringify(save, null, 2);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campfire-clicker-save-${new Date(now)
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    try {
      localStorage.setItem(SAVE_KEY, serialized);
      setLastSavedAt(now);
    } catch {
      // The downloaded file is still available as a manual backup.
    }
  }, []);

  const importSave = useCallback(
    async (file: File) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("That file could not be read as a save file.");
      }
      if (!parsed || typeof parsed !== "object") {
        throw new Error("That file is not a Campfire Clicker save.");
      }

      const save = parsed as Partial<SaveFile>;
      if (
        save.version !== SAVE_VERSION ||
        !isFiniteNonNegative(save.savedAt) ||
        !validatePersistedGame(save.game)
      ) {
        throw new Error(
          "That save file is invalid or was made with an unsupported version.",
        );
      }

      const now = Date.now();
      const secondsAway = Math.max(0, (now - save.savedAt) / 1000);
      const earnings = rounded(calculateMps(save.game) * secondsAway);
      const imported = {
        ...save.game,
        marshmallows: rounded(save.game.marshmallows + earnings),
        activeSeconds: rounded(save.game.activeSeconds + secondsAway),
        purchases: { ...save.game.purchases },
      };

      stateRef.current = imported;
      setState(imported);
      setOfflineEarnings(earnings);
      lastSimulationAt.current = now;
      roastStartedAt.current = null;
      setRoast({ progress: 0, phase: "idle", lastAward: 0 });
      setMusicEnabledValue(save.musicEnabled === true);
      musicSetting.current = save.musicEnabled === true;
      setLastSavedAt(now);
      try {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({
            version: SAVE_VERSION,
            savedAt: now,
            musicEnabled: save.musicEnabled === true,
            game: imported,
          } satisfies SaveFile),
        );
      } catch {
        throw new Error(
          "The save loaded, but this browser could not store an autosave. Keep the downloaded save file as a backup.",
        );
      }
    },
    [],
  );

  const upgrades = useMemo(() => createUpgradeViews(state), [state]);
  const publicState: CampfireState = useMemo(
    () => ({
      marshmallows: state.marshmallows,
      mpr: state.mpr,
      sticks: state.sticks,
      friends: state.friends,
      friendMpr: state.friendMpr,
      mps: calculateMps(state),
      nights: Math.floor(state.activeSeconds / 600),
      activeSeconds: state.activeSeconds,
      maxMpr: state.sticks * 5,
      goldenFriends: state.goldenFriends,
    }),
    [state],
  );

  return {
    state: publicState,
    roast,
    upgrades,
    offlineEarnings,
    lastSavedAt,
    musicEnabled,
    startRoast,
    releaseRoast,
    buyUpgrade,
    setMusicEnabled,
    exportSave,
    importSave,
  };
}
