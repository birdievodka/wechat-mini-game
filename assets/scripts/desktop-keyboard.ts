/** Desktop fallbacks: Creator's mini-game keyboard source excludes the DevTools simulator. */
export interface DesktopKeyEvent {
  code?: string; key?: string; keyCode?: number;
  ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
  preventDefault?: () => void;
}
type Listener = (event: DesktopKeyEvent) => void;
export interface KeyboardSurface {
  addEventListener(type: string, listener: Listener, capture?: boolean): void;
  removeEventListener(type: string, listener: Listener, capture?: boolean): void;
}
export interface WeChatKeyboard {
  onKeyDown?: (listener: Listener) => void; onKeyUp?: (listener: Listener) => void;
  offKeyDown?: (listener: Listener) => void; offKeyUp?: (listener: Listener) => void;
}
const CODES: Record<string, number> = {
  ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
  Space:32, KeyE:69, e:69, E:69, KeyQ:81,q:81,Q:81,ShiftLeft:16,ShiftRight:16,Shift:16,
  KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68,
  w: 87, a: 65, s: 83, d: 68, W: 87, A: 65, S: 83, D: 68,
};
export function movementKeyCode(event: DesktopKeyEvent): number | undefined {
  const code = CODES[event.code || ''] || CODES[event.key || ''] || event.keyCode;
  return code !== undefined && [16,81,32,69,37, 38, 39, 40, 87, 65, 83, 68].indexOf(code) >= 0 ? code : undefined;
}
export function attachDesktopKeyboard(
  surface: KeyboardSurface | undefined, wx: WeChatKeyboard | undefined,
  active: () => boolean, down: (code: number) => void, up: (code: number) => void, clear: () => void,
): () => void {
  const keyDown: Listener = event => {
    const target = event.target, code = movementKeyCode(event);
    if (code === undefined || !active() || event.ctrlKey || event.metaKey || event.altKey
      || target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/i.test(target?.tagName || '')) return;
    event.preventDefault?.(); down(code);
  };
  const keyUp: Listener = event => { const code = movementKeyCode(event); if (code !== undefined) up(code); };
  const blur: Listener = () => clear();
  const detach: (() => void)[] = [];
  const subscribe = (listen: () => void, unlisten: () => void): void => {
    // Some mini-game hosts expose desktop APIs but throw when registering them.
    // Optional keyboard input must never interrupt asset loading or the start menu.
    try { listen(); detach.push(unlisten); } catch (_) { /* unsupported host input source */ }
  };
  // Capture also works when the canvas has not acquired keyboard focus.
  for (const [type, listener] of [['keydown', keyDown], ['keyup', keyUp], ['blur', blur]] as [string, Listener][]) {
    if (surface) subscribe(() => surface.addEventListener(type, listener, true), () => surface.removeEventListener(type, listener, true));
  }
  if (wx?.onKeyDown) subscribe(() => wx.onKeyDown!(keyDown), () => wx.offKeyDown?.(keyDown));
  if (wx?.onKeyUp) subscribe(() => wx.onKeyUp!(keyUp), () => wx.offKeyUp?.(keyUp));
  return () => {
    for (const remove of detach.splice(0)) { try { remove(); } catch (_) { /* host already disposed */ } }
    clear();
  };
}
