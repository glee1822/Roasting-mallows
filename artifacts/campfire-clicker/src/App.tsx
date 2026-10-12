import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { Flame, Sparkles, Moon, Music2, VolumeX, Trees, Menu } from 'lucide-react';
import { useLocation } from 'wouter';
import { useCampfireGame } from '@/game/useCampfireGame';
import GameMenu from '@/components/game-menu';
import './index.css';

const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const stars = [
  [7, 18], [15, 32], [22, 11], [31, 25], [39, 8], [45, 17], [57, 12], [65, 23],
  [72, 9], [83, 19], [91, 12], [96, 32], [12, 7], [28, 18], [53, 31], [77, 27],
];

const spookyEyes = [
  { left: 8, top: 51, delay: "-1.4s", duration: "7.2s" },
  { left: 19, top: 60, delay: "-4.1s", duration: "9.5s" },
  { left: 33, top: 46, delay: "-2.2s", duration: "8.4s" },
  { left: 57, top: 55, delay: "-5.8s", duration: "10.2s" },
  { left: 73, top: 48, delay: "-3.3s", duration: "7.8s" },
  { left: 91, top: 58, delay: "-6.6s", duration: "9.1s" },
];

function pretty(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);
}

function Scene({ friends, sticks, mpr, roastPhase, roasting, fireGlow }: { friends: number; sticks: number; mpr: number; roastPhase: string; roasting: boolean; fireGlow: boolean }) {
  const visibleFriends = Math.min(friends, 8);
  const leftFriends = Math.ceil(visibleFriends / 2);
  const rightFriends = visibleFriends - leftFriends;
  const visibleSticks = Math.min(sticks, 5);
  const fireScale = Math.min(20, 7 + Math.floor(friends / 10) * 0.5) / 7;
  return (
    <div className={`scene ${fireGlow ? '' : 'fire-glow-off'}`} aria-label="A quiet campsite beneath a starry woodland sky">
      <div className="scene-sky" />
      <div className="stars" aria-hidden="true">
        {stars.map(([left, top], index) => <span className="star" key={index} style={{ left: `${left}%`, top: `${top}%`, opacity: index % 4 === 0 ? .45 : .9 }} />)}
      </div>
      <div className="moon" />
      <div className="tree-line" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => <div className={`tree ${i % 3 === 0 ? 'far' : ''}`} key={i} style={{ height: `${45 + ((i * 17) % 25)}%`, left: `${(i / 24) * 100}%` }} />)}
      </div>
      {spookyEyes.map((eye, index) => (
        <span
          className="spooky-eyes"
          aria-hidden="true"
          key={index}
          style={{
            left: `${eye.left}%`,
            top: `${eye.top}%`,
            '--blink-delay': eye.delay,
            '--blink-duration': eye.duration,
          } as CSSProperties}
        />
      ))}
      <div className="horizon" />
      <div className="ground" />
      <div className="tent-light" />
      <div className="tent" />
      {friends > 0 && <div className="friend-camp" aria-label={`${friends} campfire friends`}>
        <div className="friend-side friend-side-left">
          {Array.from({ length: leftFriends }, (_, i) => <span className="friend-person" key={`left-${i}`} />)}
        </div>
        <div className="friend-side friend-side-right">
          {Array.from({ length: rightFriends }, (_, i) => <span className="friend-person" key={`right-${i}`} />)}
        </div>
        {friends > visibleFriends && <span className="friend-overflow">+{pretty(friends - visibleFriends)}</span>}
      </div>}
      <div className={`campfire ${fireGlow ? '' : 'no-glow'}`} style={{ transform: `translateX(-50%) scale(${fireScale})` }} aria-hidden="true">
        <div className="fire-glow" />
        <span className="ember" /><span className="ember" /><span className="ember" /><span className="ember" />
        <div className="flame" /><div className="flame two" /><div className="logs" />
      </div>
      <div className="player-sticks" aria-label={`${pretty(mpr)} marshmallows on ${pretty(sticks)} sticks`}>
        {Array.from({ length: visibleSticks }, (_, stickIndex) => {
          const marshmallowsOnStick = Math.min(5, Math.max(0, mpr - stickIndex * 5));
          const visibleMarshmallows = marshmallowsOnStick;
          const angle = visibleSticks === 1 ? 0 : -2 + (stickIndex - (visibleSticks - 1) / 2) * 2;
          return (
            <div
              className={`roast-stick ${roasting ? 'active' : ''}`}
              key={stickIndex}
              style={{
                left: `calc(50% + ${(stickIndex - (visibleSticks - 1) / 2) * 16}px)`,
                '--stick-angle': `${angle}deg`,
              } as CSSProperties}
            >
              {Array.from({ length: visibleMarshmallows }, (_, marshmallowIndex) => {
                return (
                  <span
                    className={`marshmallow ${roasting && roastPhase === 'normal' ? 'toasting' : ''} ${roastPhase === 'golden' ? 'golden' : ''} ${roastPhase === 'burnt' ? 'burnt' : ''}`}
                    key={marshmallowIndex}
                    style={{
                      left: '-4px',
                      top: `${-14 + marshmallowIndex * 21}px`,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
        {sticks > visibleSticks && <span className="stick-overflow">+{pretty(sticks - visibleSticks)} sticks</span>}
        <span className="player-sleeve" />
        <span className="player-hand" />
      </div>
      <div className="scene-vignette" />
    </div>
  );
}

function App() {
  const game = useCampfireGame();
  const { state, roast, upgrades, offlineEarnings, settings } = game;
  const [menuOpen, setMenuOpen] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const roastPointer = useRef(false);
  const releaseRef = useRef(game.releaseRoast);
  releaseRef.current = game.releaseRoast;

  const openMenu = useCallback(() => {
    releaseRef.current();
    roastPointer.current = false;
    setMenuOpen(true);
  }, []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const signIn = useCallback(() => setLocation('/sign-in'), [setLocation]);
  const signUp = useCallback(() => setLocation('/sign-up'), [setLocation]);
  const signOutOfAccount = useCallback(() => {
    void signOut({ redirectUrl: appBasePath || '/' });
  }, [signOut]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
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
  const isRoasting = roast.phase === 'roasting';
  const roastOutcome = roast.phase === 'early' ? 'Uncooked roast'
    : roast.phase === 'normal' ? 'Normal roast'
      : roast.phase === 'golden' ? 'Golden roast'
        : roast.phase === 'burnt' ? 'Burnt roast' : null;

  return (
    <main className="camp-app">
      <Scene friends={state.friends} sticks={state.sticks} mpr={state.mpr} roastPhase={roast.phase} roasting={isRoasting} fireGlow={settings.fireGlow} />
      <header className="topbar load-in">
        <div className="brand-lockup">
          <div className="brand-mark"><Flame size={18} strokeWidth={1.8} /></div>
          <div><span className="brand-name">roasting mallows</span><span className="brand-note">a little night in the woods</span></div>
        </div>
        <div className="night-pill"><Moon size={14} /><span>NIGHT {pretty(state.nights)}</span></div>
        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => game.setMusicEnabled(!settings.musicEnabled)} aria-label={settings.musicEnabled ? 'Turn ambient sound off' : 'Turn ambient sound on'} title={settings.musicEnabled ? 'Ambient sound on' : 'Ambient sound off'} data-testid="button-music">
            {settings.musicEnabled ? <Music2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button className="icon-button" type="button" onClick={openMenu} title="Open campsite menu" aria-label="Open campsite menu" aria-expanded={menuOpen} aria-controls="game-menu" data-testid="button-menu"><Menu size={17} /></button>
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

      <div className="roast-panel load-in">
        <div className="roast-control">
          <div
            className="roast-meter"
            role="progressbar"
            aria-label={`Roast progress ${Math.round(roast.progress * 100)} percent`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(roast.progress * 100)}
          >
            <div className="meter-zones"><span className="zone-raw" /><span className="zone-normal" /><span className="zone-golden" /></div>
            <div className="progress-track"><div className={`progress-fill phase-${roast.phase}`} style={{ height: `${Math.min(100, Math.max(0, roast.progress * 100))}%` }} /></div>
          </div>
          <button className={`roast-button ${isRoasting ? 'roasting' : ''}`} type="button" onPointerDown={onRoastPointerDown} onPointerUp={onRoastPointerUp} onPointerCancel={onRoastPointerUp} onLostPointerCapture={onRoastPointerUp} onContextMenu={(event) => event.preventDefault()} aria-label="Hold to roast a marshmallow" data-testid="button-roast">
            <Flame size={18} /><span className="visually-hidden">{isRoasting ? 'Roasting' : 'Hold to roast; release to stop'}</span>
          </button>
        </div>
        {roastOutcome && (
          <div className={`roast-feedback phase-${roast.phase}`} role="status" aria-live="polite" data-testid="status-roast-feedback">
            <span>{roastOutcome}</span>
            {roast.lastAward > 0 && <b>+{pretty(roast.lastAward)}</b>}
          </div>
        )}
      </div>

      <GameMenu
        open={menuOpen}
        onClose={closeMenu}
        state={state}
        upgrades={upgrades}
        onBuyUpgrade={game.buyUpgrade}
        settings={settings}
        onSetMusicEnabled={game.setMusicEnabled}
        onSetMusicVolume={game.setMusicVolume}
        onSetFireGlow={game.setFireGlow}
        onExportSave={game.exportSave}
        onImportSave={game.importSave}
        onResetGame={game.resetGame}
        authLoading={!isLoaded}
        signedIn={Boolean(isSignedIn)}
        userLabel={user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || null}
        onSignIn={signIn}
        onSignUp={signUp}
        onSignOut={signOutOfAccount}
      />
      <div className="scene-caption"><span className="caption-rule" />A quiet place to make something sweet</div>
    </main>
  );
}

export default App;
