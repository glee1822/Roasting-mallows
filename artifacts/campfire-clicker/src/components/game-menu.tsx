import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronRight,
  Flame,
  LogIn,
  LogOut,
  Music2,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { CampfireState, GameSettings, Upgrade } from '@/game/gameTypes';
import './game-menu.css';

export interface GameMenuProps {
  open: boolean;
  onClose: () => void;
  state: CampfireState;
  upgrades: Upgrade[];
  onBuyUpgrade: (id: string) => void;
  settings: GameSettings;
  onSetMusicEnabled: (enabled: boolean) => void;
  onSetMusicVolume: (volume: number) => void;
  onSetFireGlow: (enabled: boolean) => void;
  onExportSave: () => void;
  onImportSave: (file: File) => Promise<void>;
  onResetGame: () => void;
  authLoading: boolean;
  signedIn: boolean;
  userLabel: string | null;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
}

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);
}

function UpgradeCard({
  upgrade,
  state,
  onBuy,
}: {
  upgrade: Upgrade;
  state: CampfireState;
  onBuy: (id: string) => void;
}) {
  const needsMoreSticks = upgrade.id.startsWith('mpr-') && state.mpr + upgrade.amount > state.maxMpr;
  const isGoldenLesson = upgrade.id === 'golden-friends';
  const isRoastSpeed = upgrade.id === 'roast-speed';
  const canBuy = upgrade.unlocked && upgrade.affordable && !upgrade.capped
    && !needsMoreSticks && state.marshmallows >= upgrade.cost;
  const actionLabel = !upgrade.unlocked
    ? 'Locked'
    : upgrade.capped
      ? 'Maxed'
      : needsMoreSticks
        ? 'Need sticks'
        : isGoldenLesson
          ? 'Learn'
          : formatNumber(upgrade.cost);

  return (
    <article className={`gm-upgrade ${!upgrade.unlocked ? 'gm-upgrade-locked' : ''}`} data-testid={`menu-upgrade-${upgrade.id}`}>
      <span className={`gm-upgrade-mark ${upgrade.category === 'player' ? 'gm-mark-player' : 'gm-mark-friends'}`} aria-hidden="true">
        {upgrade.category === 'player' ? <Flame size={16} /> : <Users size={16} />}
      </span>
      <div className="gm-upgrade-copy">
        <div className="gm-upgrade-name">{upgrade.name}<span>×{formatNumber(upgrade.purchased)}</span></div>
        <p>{upgrade.description}</p>
        {upgrade.maxPurchases !== undefined && <small>{formatNumber(upgrade.purchased)} / {formatNumber(upgrade.maxPurchases)} owned</small>}
        {!isGoldenLesson && (
          <small className="gm-upgrade-yield">
            {isRoastSpeed
              ? `−${formatNumber(upgrade.amount, 2)} sec / roast`
              : `+${formatNumber(upgrade.amount, 2)} ${upgrade.category === 'player' ? 'roast power' : 'mallow / sec'}`}
          </small>
        )}
      </div>
      <button
        className="gm-buy"
        type="button"
        disabled={!canBuy}
        onClick={() => onBuy(upgrade.id)}
        aria-label={`${actionLabel}${upgrade.unlocked && !needsMoreSticks && !upgrade.capped && !isGoldenLesson ? ` marshmallows for ${upgrade.name}` : ` ${upgrade.name}`}`}
        data-testid={`menu-buy-${upgrade.id}`}
      >
        <span>{actionLabel}</span>
        {upgrade.unlocked && !needsMoreSticks && !upgrade.capped && !isGoldenLesson && <small>mallows</small>}
      </button>
    </article>
  );
}

export function GameMenu({
  open,
  onClose,
  state,
  upgrades,
  onBuyUpgrade,
  settings,
  onSetMusicEnabled,
  onSetMusicVolume,
  onSetFireGlow,
  onExportSave,
  onImportSave,
  onResetGame,
  authLoading,
  signedIn,
  userLabel,
  onSignIn,
  onSignUp,
  onSignOut,
}: GameMenuProps) {
  const [section, setSection] = useState<'upgrades' | 'settings'>('upgrades');
  const [upgradeTab, setUpgradeTab] = useState<'player' | 'friends'>('player');
  const [confirmReset, setConfirmReset] = useState(false);
  const [importStatus, setImportStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [mounted, setMounted] = useState(open);
  const fileInput = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), 250);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 0);
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !drawer.current) return;
      const focusable = Array.from(drawer.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      if (!open && returnFocus.current?.isConnected) {
        returnFocus.current.focus({ preventScroll: true });
      }
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    setConfirmReset(false);
    setImportStatus(null);
  }, [open]);

  if (!mounted) return null;

  const visibleUpgrades = upgrades.filter((upgrade) => upgrade.category === upgradeTab);
  const doImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setImportStatus(null);
    try {
      await onImportSave(file);
      setImportStatus({ tone: 'success', message: 'Save imported. Your campsite is back where you left it.' });
    } catch (error) {
      setImportStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      input.value = '';
    }
  };

  const handleReset = () => {
    if (resetting) return;
    setResetting(true);
    try {
      onResetGame();
      setConfirmReset(false);
      setImportStatus({ tone: 'success', message: 'A fresh night begins.' });
    } finally {
      setResetting(false);
    }
  };

  const stopInsideClick = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === ' ') event.stopPropagation();
  };

  return (
    <div className={`game-menu-layer ${open ? '' : 'gm-closing'}`} data-testid="game-menu">
      <button className={`gm-scrim ${open ? '' : 'gm-closing'}`} type="button" aria-label="Close menu" onClick={onClose} tabIndex={-1} />
      <aside
        id="game-menu"
        ref={drawer}
        className={`gm-drawer ${open ? '' : 'gm-closing'}`}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-labelledby="gm-title"
        aria-describedby="gm-description"
        onKeyDown={stopInsideClick}
      >
        <div className="gm-topline">
          <span className="gm-eyebrow"><span className="gm-live-dot" /> YOUR CAMPSITE</span>
          <button ref={closeButton} className="gm-close" type="button" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <header className="gm-heading">
          <h2 id="gm-title">Around the fire</h2>
          <p id="gm-description">Make this little camp your own.</p>
        </header>

        <nav className="gm-main-tabs" aria-label="Menu sections">
          <button type="button" className={section === 'upgrades' ? 'active' : ''} aria-current={section === 'upgrades' ? 'page' : undefined} onClick={() => setSection('upgrades')}>
            <Sparkles size={15} /> Upgrades
          </button>
          <button type="button" className={section === 'settings' ? 'active' : ''} aria-current={section === 'settings' ? 'page' : undefined} onClick={() => setSection('settings')}>
            <SlidersHorizontal size={15} /> Settings
          </button>
        </nav>

        {section === 'upgrades' ? (
          <section className="gm-section gm-upgrades-section" aria-label="Upgrades">
            <div className="gm-camp-summary">
              <div><span>MARSHMALLOWS</span><strong>{formatNumber(state.marshmallows)}</strong></div>
              <div><span>ROAST POWER</span><strong>{formatNumber(state.mpr, 2)} <small>/ {formatNumber(state.maxMpr, 2)}</small></strong></div>
              <div><span>FRIENDS</span><strong>{formatNumber(state.friends)}</strong></div>
            </div>
            <div className="gm-category-tabs" role="tablist" aria-label="Upgrade category">
              <button type="button" role="tab" aria-selected={upgradeTab === 'player'} className={upgradeTab === 'player' ? 'selected' : ''} onClick={() => setUpgradeTab('player')}>
                <Flame size={14} /> Player
              </button>
              <button type="button" role="tab" aria-selected={upgradeTab === 'friends'} className={upgradeTab === 'friends' ? 'selected' : ''} onClick={() => setUpgradeTab('friends')}>
                <Users size={14} /> Friends
              </button>
            </div>
            <div className="gm-upgrade-list" role="tabpanel" aria-label={`${upgradeTab === 'player' ? 'Player' : 'Friends'} upgrades`}>
              {visibleUpgrades.length > 0 ? visibleUpgrades.map((upgrade) => (
                <UpgradeCard key={upgrade.id} upgrade={upgrade} state={state} onBuy={onBuyUpgrade} />
              )) : (
                <div className="gm-empty">
                  <span className="gm-empty-mark"><Flame size={18} /></span>
                  <strong>Nothing stirring just yet.</strong>
                  <p>More {upgradeTab === 'player' ? 'ways to roast' : 'friends to meet'} will find their way here.</p>
                </div>
              )}
            </div>
            <footer className="gm-panel-foot">The good things take a little time.</footer>
          </section>
        ) : (
          <section className="gm-section gm-settings-section" aria-label="Settings">
            <div className="gm-setting-group">
              <h3>At the campsite</h3>
              <div className="gm-setting-row">
                <span className="gm-setting-icon"><Music2 size={16} /></span>
                <div className="gm-setting-copy"><strong>Ambient sound</strong><small>A little music for the night</small></div>
                <button
                  className={`gm-switch ${settings.musicEnabled ? 'is-on' : ''}`}
                  type="button"
                  role="switch"
                  aria-checked={settings.musicEnabled}
                  aria-label="Ambient sound"
                  onClick={() => onSetMusicEnabled(!settings.musicEnabled)}
                  data-testid="menu-toggle-music"
                ><span /></button>
              </div>
              <label className={`gm-volume-row ${!settings.musicEnabled ? 'is-muted' : ''}`}>
                <span className="gm-setting-icon">{settings.musicVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</span>
                <span className="gm-setting-copy"><strong>Volume</strong><small>{formatNumber(settings.musicVolume)}%</small></span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.musicVolume}
                  disabled={!settings.musicEnabled}
                  aria-label="Ambient sound volume"
                  onChange={(event) => onSetMusicVolume(Number(event.currentTarget.value))}
                  data-testid="menu-volume"
                />
              </label>
              <div className="gm-setting-row">
                <span className="gm-setting-icon gm-fire-icon"><Flame size={16} /></span>
                <div className="gm-setting-copy"><strong>Fire glow</strong><small>Let the light spill a little further</small></div>
                <button
                  className={`gm-switch ${settings.fireGlow ? 'is-on' : ''}`}
                  type="button"
                  role="switch"
                  aria-checked={settings.fireGlow}
                  aria-label="Fire glow"
                  onClick={() => onSetFireGlow(!settings.fireGlow)}
                  data-testid="menu-toggle-glow"
                ><span /></button>
              </div>
            </div>

            <div className="gm-setting-group gm-account-group">
              <h3>Camp account</h3>
              {signedIn ? (
                <div className="gm-account-card">
                  <span className="gm-avatar" aria-hidden="true">{(userLabel?.trim().charAt(0) || 'C').toUpperCase()}</span>
                  <span className="gm-setting-copy"><strong>{userLabel || 'Signed in'}</strong><small>Game progress stays in this browser</small></span>
                  <button type="button" className="gm-text-action" onClick={onSignOut} disabled={authLoading}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              ) : (
                <>
                  <p className="gm-account-note">Sign in with Google. Game progress is saved in this browser.</p>
                  <div className="gm-auth-actions">
                    <button className="gm-auth-primary" type="button" onClick={onSignIn} disabled={authLoading}>
                      <LogIn size={15} /> {authLoading ? 'One moment…' : 'Sign in with Google'}
                    </button>
                    <button className="gm-auth-secondary" type="button" onClick={onSignUp} disabled={authLoading}>
                      Create an account <ChevronRight size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="gm-setting-group gm-save-group">
              <h3>Save & restore</h3>
              <p className="gm-account-note">Keep a copy close, just in case.</p>
              <div className="gm-save-actions">
                <button className="gm-save-button" type="button" onClick={() => { onExportSave(); setImportStatus({ tone: 'success', message: 'Save file downloaded.' }); }} data-testid="menu-export">
                  <ArrowDownToLine size={15} /> Export save
                </button>
                <button className="gm-save-button" type="button" onClick={() => { setImportStatus(null); fileInput.current?.click(); }} data-testid="menu-import">
                  <ArrowUpFromLine size={15} /> Import save
                </button>
                <input ref={fileInput} className="gm-file-input" type="file" accept=".json,application/json" onChange={doImport} aria-label="Choose save file to import" tabIndex={-1} />
              </div>
              {importStatus && (
                <div className={`gm-message ${importStatus.tone}`} role={importStatus.tone === 'error' ? 'alert' : 'status'} data-testid="menu-save-status">
                  {importStatus.tone === 'success' ? <Check size={15} /> : <ShieldAlert size={15} />}
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>

            <div className="gm-setting-group gm-reset-group">
              <h3>Start over</h3>
              {!confirmReset ? (
                <button className="gm-reset-button" type="button" onClick={() => setConfirmReset(true)} data-testid="menu-reset">
                  <RotateCcw size={15} /> Begin a new game
                </button>
              ) : (
                <div className="gm-reset-warning" role="alert">
                  <span className="gm-warning-icon"><ShieldAlert size={17} /></span>
                  <div>
                    <strong>Leave this camp behind?</strong>
                    <p>Your marshmallows, friends, and upgrades will all be lost. This cannot be undone.</p>
                    <div className="gm-confirm-actions">
                      <button className="gm-reset-confirm" type="button" onClick={handleReset} disabled={resetting}>Yes, start fresh</button>
                      <button className="gm-cancel-reset" type="button" onClick={() => setConfirmReset(false)}>Keep my camp</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <footer className="gm-panel-foot">Take your time. The fire will be here.</footer>
          </section>
        )}
      </aside>
    </div>
  );
}

export default GameMenu;
