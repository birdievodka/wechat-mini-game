export const SIDEBAR_REWARD_GOLD = 5;
const STORAGE_KEY = 'taoyuan-douyin-sidebar-reward';
const dayInChina = (timestamp: number): number => Math.floor((timestamp + 8 * 3600000) / 86400000);

interface LaunchBridge {
  readonly sidebarAt?: number;
  subscribe(listener: () => void): () => void;
}
interface SidebarHost {
  checkScene?(options: { scene: 'sidebar'; success(result: { isExist: boolean }): void; fail(): void }): void;
  navigateToScene?(options: { scene: 'sidebar'; success(): void; fail(): void }): void;
}
interface RewardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
interface RewardRecord {
  claimedDay: number;
  pending: boolean;
}
export type SidebarRewardStatus = 'guide' | 'claim' | 'pending' | 'claimed' | 'storage-error';

declare const tt: SidebarHost | undefined;
declare const GameGlobal: { __taoyuanDouyinLaunch?: LaunchBridge } | undefined;

export function createDouyinSidebar(storage: RewardStorage): DouyinSidebar | undefined {
  if (typeof tt === 'undefined' || typeof GameGlobal === 'undefined') return;
  const launch = GameGlobal.__taoyuanDouyinLaunch;
  if (launch && tt.checkScene) return new DouyinSidebar(tt, launch, storage);
}

export class DouyinSidebar {
  private support?: boolean;
  private checking = false;
  private navigating = false;
  private unsubscribe: () => void;
  private readonly listeners = new Set<() => void>();

  constructor(private host: SidebarHost, private launch: LaunchBridge, private storage: RewardStorage, private now = Date.now) {
    this.unsubscribe = launch.subscribe(() => this.refresh());
  }

  get available(): boolean { return this.support === true; }
  get canNavigate(): boolean { return typeof this.host.navigateToScene === 'function'; }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.unsubscribe();
    this.listeners.clear();
  }

  check(): void {
    if (this.checking || this.support !== undefined || !this.host.checkScene) return;
    this.checking = true;
    let finished = false;
    const finish = (support?: boolean) => {
      if (finished) return;
      finished = true;
      this.checking = false;
      this.support = support;
      this.refresh();
    };
    try {
      this.host.checkScene({ scene: 'sidebar', success: result => finish(result.isExist === true), fail: () => finish() });
    } catch (_) { finish(); }
  }

  navigate(done: (success: boolean) => void): void {
    if (!this.available || this.navigating || !this.host.navigateToScene) return;
    this.navigating = true;
    let finished = false;
    const finish = (success: boolean) => {
      if (finished) return;
      finished = true;
      this.navigating = false;
      done(success);
    };
    try {
      this.host.navigateToScene({ scene: 'sidebar', success: () => finish(true), fail: () => finish(false) });
    } catch (_) { finish(false); }
  }

  status(today = dayInChina(this.now())): SidebarRewardStatus {
    try {
      const record = this.read();
      if (record?.pending) return 'pending';
      if (record && record.claimedDay >= today) return 'claimed';
      return this.available && this.launch.sidebarAt !== undefined && dayInChina(this.launch.sidebarAt) === today ? 'claim' : 'guide';
    } catch (_) { return 'storage-error'; }
  }

  claim(): SidebarRewardStatus {
    const today = dayInChina(this.now());
    const status = this.status(today);
    if (status !== 'claim') return status;
    try {
      this.write({ claimedDay: today, pending: true });
      return 'pending';
    } catch (_) { return 'storage-error'; }
  }

  takeGold(): number {
    try {
      const record = this.read();
      if (!record?.pending) return 0;
      this.write({ ...record, pending: false });
      return SIDEBAR_REWARD_GOLD;
    } catch (_) { return 0; }
  }

  private read(): RewardRecord | undefined {
    const saved = this.storage.getItem(STORAGE_KEY);
    if (!saved) return;
    const record = JSON.parse(saved) as Partial<RewardRecord> | null;
    if (!Number.isInteger(record?.claimedDay) || typeof record?.pending !== 'boolean') throw new Error('侧边栏奖励记录无效');
    return { claimedDay: record.claimedDay!, pending: record.pending };
  }

  private write(record: RewardRecord): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(record));
  }

  private refresh(): void {
    for (const listener of this.listeners) listener();
  }
}
