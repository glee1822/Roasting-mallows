import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from 'react';
import { Flame, Sparkles, ChevronDown, Moon, Music2, VolumeX, Download, Upload, Users, Tent, Trees, Timer, ShoppingBag, Check, CircleHelp } from 'lucide-react';
import { useCampfireGame } from '@/game/useCampfireGame';
import type { Upgrade } from '@/game/gameTypes';
import './index.css';

const stars = [
  [7, 18], [15, 32], [22, 11], [31, 25], [39, 8], [45, 17], [57, 12], [65, 23],
  [72, 9], [83, 19], [91, 12], [96, 32], [12, 7], [28, 18], [53, 31], [77, 27],
];

function pretty(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);
}

function timeSince(timestamp: number) {
  if (!timestamp) return 'just now';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} hr${hours === 1 ? '' : 's'} ago` : `${Math.floor(hours / 24)} days ago`;
}

function Scene({ friends, sticks, mpr, roastPhase, roasting }: { friends: number; sticks: number; mpr: number; roastPhase: string; roasting: boolean }) {
  const visibleFriends = Math.min(friends, 8);
  const visibleSticks = Math.min(sticks, 5);
  const fireScale = Math.min(20, 7 + Math.floor(friends / 10) * 0.5) / 7;
  return (
    <div className="scene" aria-label="A quiet campsite beneath a starry woodland sky">
      <div className="scene-sky" />
      <div className="stars" aria-hidden="true">
        {stars.map(([left, top], index) => <span className="star" key={index} style={{ left: `${left}%`, top: `${top}%`, opacity: index % 4 === 0 ? .45 : .9 }} />)}
      </div>
      <div className="moon" />
      <div className="tree-line" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => <div className={`tree ${i % 3 === 0 ? 'far' : ''}`} key={i} style={{ height: `${66 + ((i * 17) % 31)}%` }} />)}
      </div>
      <div className="eyes" aria-hidden="true" />
      <div className="horizon" />
      <div className="ground" />
      <div className="tent-light" />
      <div className="tent" />
      {friends > 0 && <div className="friend-camp" aria-label={`${friends} campfire friends`}>
        {Array.from({ length: visibleFriends }, (_, i) => <span className="friend-person" key={i} />)}
        {friends > visibleFriends && <span className="friend-overflow">+{pretty(friends - visibleFriends)}</span>}
      </div>}
      <div className="campfire" style={{ transform: `translateX(-50%) scale(${fireScale})` }} aria-hidden="true">
        <div className="fire-glow" />
        <span className="ember" /><span className="ember" /><span className="ember" /><span className="ember" />
        <div className="flame" /><div className="flame two" /><div className="logs" />
      </div>
      <div className="player-sticks" aria-label={`${pretty(mpr)} marshmallows on ${pretty(sticks)} sticks`}>
        {Array.from({ length: visibleSticks }, (_, stickIndex) => {
          const marshmallowsOnStick = Math.min(5, Math.max(0, mpr - stickIndex * 5));
          const angle = -31 + (stickIndex - (visibleSticks - 1) / 2) * 5;
          return (
            <div
              className={`roast-stick ${roasting ? 'active' : ''}`}
              key={stickIndex}
              style={{
                left: `calc(50% + ${(stickIndex - (visibleSticks - 1) / 2) * 16}px)`,
                '--stick-angle': `${angle}deg`,
              } as CSSProperties}
            >
              {Array.from({ length: marshmallowsOnStick }, (_, marshmallowIndex) => (
                <span
                  className={`marshmallow ${roasting && roastPhase === 'normal' ? 'toasting' : ''} ${roastPhase === 'golden' ? 'golden' : ''} ${roastPhase === 'burnt' ? 'burnt' : ''}`}
                  key={marshmallowIndex}
                  style={{
                    left: `${-7 + (marshmallowIndex % 3 - 1) * 11}px`,
                    top: `${-14 + Math.floor(marshmallowIndex / 3) * 13}px`,
                  }}
                />
              ))}
            </div>
          );
        })}
        {sticks > visibleSticks && <span className="stick-overflow">+{pretty(sticks - visibleSticks)} sticks</span>}
      </div>
      <div className="scene-vignette" />
    </div>
  );
}

function UpgradeRow({ upgrade, onBuy, marshmallows }: { upgrade: Upgrade; onBuy: (id: string) => void; marshmallows: number }) {
  const canBuy = upgrade.unlocked && upgrade.affordable && marshmallows >= upgrade.cost;
  return (
    <article className={`upgrade-row ${!upgrade.unlocked ? 'upgrade-locked' : ''}`} data-testid={`upgrade-${upgrade.id}`}>
      <div className="upgrade-glyph">{upgrade.category === 'player' ? <Flame size={17} /> : <Users size={17} />}</div>
      <div className="upgrade-copy">
        <div className="upgrade-title">{upgrade.name}<span className="upgrade-owned">×{upgrade.purchased}</span></div>
        <p>{upgrade.description}</p>
        <span className="upgrade-output">+{pretty(upgrade.amount, 2)} {upgrade.category === 'player' ? 'roast power' : 'marshmallows / sec'}</span>
      </div>
      <button className="buy-button" type="button" disabled={!canBuy} onClick={() => onBuy(upgrade.id)} data-testid={`button-buy-${upgrade.id}`}>
        <span>{upgrade.unlocked ? pretty(upgrade.cost) : 'Locked'}</span>
        {upgrade.unlocked && <span className="buy-currency">mallow</span>}
      </button>
    </article>
  );
}

function App() {
  const game = useCampfireGame();
  const { state, roast, upgrades, offlineEarnings, lastSavedAt, musicEnabled } = game;
  const [shopOpen, setShopOpen] = useState(true);
  const [shopTab, setShopTab] = useState<'player' | 'friends'>('player');
  const [ioMessage, setIoMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const roastPointer = useRef(false);
  const releaseRef = useRef(game.releaseRoast);
  releaseRef.current = game.releaseRoast;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code !== 'Space' || event.repeat) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable || tag === 'button' || target?.closest('button,[role="button"]')) return;
    event.preventDefault();
    game.startRoast();
  }, [game.startRoast]);
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space') {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable || tag === 'button' || target?.closest('button,[role="button"]')) return;
      releaseRef.current();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const releaseOnBlur = () => releaseRef.current();
    window.addEventListener('blur', releaseOnBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseOnBlur);
    };
  }, [handleKeyDown, handleKeyUp]);

  const onRoastPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (roastPointer.current) return;
    roastPointer.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    game.startRoast();
  };
  const onRoastPointerUp = () => {
    if (!roastPointer.current) return;
    roastPointer.current = false;
    game.releaseRoast();
  };
  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setIoMessage(null);
    try {
      await game.importSave(file);
      setIoMessage({ tone: 'success', text: 'Camp saved from file. Welcome back.' });
    } catch (error) {
      setIoMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Could not read that save file.' });
    } finally {
      input.value = '';
    }
  };
  const visibleUpgrades = upgrades.filter((upgrade: Upgrade) => upgrade.category === shopTab);
  const phaseCopy = roast.phase === 'roasting'
    ? roast.progress < 1 ? 'Easy does it…' : 'Watch the glow'
    : roast.phase === 'early' ? 'A little underdone — try holding a touch longer'
      : roast.phase === 'normal' ? 'Nicely toasted — full roast power'
        : roast.phase === 'golden' ? 'A rare golden roast!'
          : roast.phase === 'burnt' ? 'A little too toasty — no worries, try again'
            : 'Hold to roast · release when it looks right';
  const isRoasting = roast.phase === 'roasting';

  return (
    <main className="camp-app">
      <Scene friends={state.friends} sticks={state.sticks} mpr={state.mpr} roastPhase={roast.phase} roasting={isRoasting} />
      <header className="topbar load-in">
        <div className="brand-lockup">
          <div className="brand-mark"><Flame size={18} strokeWidth={1.8} /></div>
          <div><span className="brand-name">Campfire Clicker</span><span className="brand-note">a little night in the woods</span></div>
        </div>
        <div className="night-pill"><Moon size={14} /><span>NIGHT {pretty(state.nights)}</span></div>
        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => game.setMusicEnabled(!musicEnabled)} aria-label={musicEnabled ? 'Turn ambient sound off' : 'Turn ambient sound on'} title={musicEnabled ? 'Ambient sound on' : 'Ambient sound off'} data-testid="button-music">
            {musicEnabled ? <Music2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button className="icon-button save-trigger" type="button" onClick={game.exportSave} title="Export save" aria-label="Export save" data-testid="button-export"><Download size={17} /></button>
          <button className="icon-button" type="button" onClick={() => fileInput.current?.click()} title="Import save" aria-label="Import save" data-testid="button-import"><Upload size={17} /></button>
          <input ref={fileInput} className="visually-hidden" type="file" accept=".json,application/json" onChange={onImport} data-testid="input-import-save" />
        </div>
      </header>
      <section className="hud load-in" aria-label="Camp stats">
        <div className="mallow-total"><span className="stat-label">YOUR MARSHMALLOWS</span><strong data-testid="text-marshmallow-count">{pretty(state.marshmallows)}</strong><span className="stat-rate">+{pretty(state.mps, 2)} <small>per second</small></span></div>
        <div className="hud-divider" />
        <div className="hud-stat"><span className="stat-icon"><Flame size={14} /></span><span className="stat-label">ROAST POWER</span><strong>{pretty(state.mpr, 2)}<small> / {pretty(state.maxMpr, 2)}</small></strong></div>
        <div className="hud-stat"><span className="stat-icon muted-icon"><Trees size={14} /></span><span className="stat-label">YOUR CAMPSITE</span><strong>{pretty(state.sticks)} <small>sticks</small><span className="stat-dot">·</span>{pretty(state.friends)} <small>friends</small></strong></div>
      </section>

      {offlineEarnings > 0 && <div className="offline-note load-in" role="status" data-testid="status-offline-earnings">
        <Sparkles size={15} /><span>While you were away, your friends gathered <strong>{pretty(offlineEarnings)} marshmallows.</strong></span>
      </div>}

      <aside className={`shop-panel ${shopOpen ? 'is-open' : 'is-closed'}`} aria-label="Campsite shop">
        <button className="shop-heading" type="button" onClick={() => setShopOpen(!shopOpen)} aria-expanded={shopOpen} data-testid="button-toggle-shop">
          <span className="shop-icon"><ShoppingBag size={16} /></span><span className="shop-title">Campsite</span><span className="shop-count">{upgrades.filter((u: Upgrade) => u.unlocked).length} upgrades</span><ChevronDown size={17} className="shop-chevron" />
        </button>
        {shopOpen && <div className="shop-content">
          <div className="shop-tabs" role="tablist" aria-label="Upgrade type">
            <button type="button" role="tab" aria-selected={shopTab === 'player'} className={shopTab === 'player' ? 'selected' : ''} onClick={() => setShopTab('player')} data-testid="tab-player"><Flame size={14} /> Player</button>
            <button type="button" role="tab" aria-selected={shopTab === 'friends'} className={shopTab === 'friends' ? 'selected' : ''} onClick={() => setShopTab('friends')} data-testid="tab-friends"><Users size={14} /> Friends</button>
          </div>
          <div className="shop-scroll">
            {visibleUpgrades.length ? visibleUpgrades.map((upgrade: Upgrade) => <UpgradeRow key={upgrade.id} upgrade={upgrade} onBuy={game.buyUpgrade} marshmallows={state.marshmallows} />) : <div className="shop-empty"><Tent size={22} /><span>The woods are quiet for now.</span><small>More campsite improvements will appear here.</small></div>}
          </div>
          <div className="shop-footer"><span><Timer size={13} /> {pretty(state.activeSeconds / 60, 1)} min around the fire</span><span>Saved {timeSince(lastSavedAt)}</span></div>
        </div>}
      </aside>

      <div className="roast-panel load-in">
        <div className={`roast-feedback phase-${roast.phase}`} role="status" aria-live="polite" data-testid="status-roast-feedback">
          {roast.phase === 'golden' ? <Sparkles size={14} /> : roast.phase === 'normal' ? <Check size={14} /> : roast.phase === 'burnt' ? <Flame size={14} /> : roast.phase === 'early' ? <CircleHelp size={14} /> : <span className="feedback-dot" />}
          <span>{phaseCopy}</span>
          {roast.lastAward > 0 && !isRoasting && <b>+{pretty(roast.lastAward)}</b>}
        </div>
        <div className="roast-meter" aria-label={`Roast progress ${Math.round(roast.progress * 100)} percent`}>
          <div className="meter-zones"><span /><span /><span /></div>
          <div className="progress-track"><div className={`progress-fill phase-${roast.phase}`} style={{ width: `${Math.min(100, Math.max(0, roast.progress * 100))}%` }} /></div>
          <div className="meter-labels"><span>RAW</span><span>GOLDEN</span><span>TOASTY</span></div>
        </div>
        <button className={`roast-button ${isRoasting ? 'roasting' : ''}`} type="button" onPointerDown={onRoastPointerDown} onPointerUp={onRoastPointerUp} onPointerCancel={onRoastPointerUp} onLostPointerCapture={onRoastPointerUp} onContextMenu={(event) => event.preventDefault()} aria-label="Hold to roast a marshmallow" data-testid="button-roast">
          <Flame size={18} /><span>{isRoasting ? 'ROASTING…' : 'HOLD TO ROAST'}</span><kbd>SPACE</kbd>
        </button>
        <p className="roast-hint">Release when it reaches the sweet spot. A burnt one is only a marshmallow lost.</p>
      </div>

      {ioMessage && <div className={`io-message ${ioMessage.tone}`} role="status" data-testid="status-save-message">
        <span>{ioMessage.text}</span><button type="button" onClick={() => setIoMessage(null)} aria-label="Dismiss message" data-testid="button-dismiss-message">×</button>
      </div>}
      <div className="scene-caption"><span className="caption-rule" />A quiet place to make something sweet</div>
    </main>
  );
}

export default App;
