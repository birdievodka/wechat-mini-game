export const WECHAT_AD_UNITS = {
  skill: 'adunit-37dcc4d426c30846',
  revive: 'adunit-7d0c52eb5613c4b6',
  freeSupply: 'adunit-4a59be00d14c8c82',
} as const;

type AdPlacement = keyof typeof WECHAT_AD_UNITS;
const AD_OPEN_TIMEOUT = 18_000;
export type AdOutcome = 'complete' | 'skipped' | 'unavailable';
export type AdAction = (current: () => boolean) => Promise<AdOutcome>;
export type SkillAdAction = (id: string, current: () => boolean) => Promise<AdOutcome>;
export type FreeSupplyStatus = 'ready' | 'opening' | 'available' | 'used' | 'unavailable';
type AdClose = (result?: { isEnded?: boolean }) => void;
interface NativeAd {
  load(): Promise<unknown>;
  show(): Promise<unknown>;
  onClose(listener: AdClose): void;
  offClose(listener: AdClose): void;
  onError?(listener: () => void): void;
  offError?(listener: () => void): void;
  destroy(): void;
}
export interface WeChatAdHost {
  createRewardedVideoAd?(options: { adUnitId: string; multiton: boolean; disableFallbackSharePage: boolean }): NativeAd;
  createInterstitialAd?(options: { adUnitId: string }): NativeAd;
}

/** All three scenes share one playback lock and own a native instance only while using it. */
export class WeChatAds {
  private cancel?: () => void;
  private disposed = false;

  constructor(private host: () => WeChatAdHost | undefined, private onDisplayChange?: (displaying: boolean) => void) {}

  supports(placement: AdPlacement): boolean {
    const host = this.host();
    return !this.disposed && (placement === 'freeSupply'
      ? typeof host?.createInterstitialAd === 'function'
      : typeof host?.createRewardedVideoAd === 'function');
  }

  play(placement: AdPlacement, current: () => boolean): Promise<AdOutcome> {
    if (this.cancel || !this.supports(placement) || !current()) return Promise.resolve('unavailable');
    const host = this.host()!;
    const adUnitId = WECHAT_AD_UNITS[placement];
    const interstitial = placement === 'freeSupply';
    let ad: NativeAd;
    try {
      ad = interstitial ? host.createInterstitialAd!({ adUnitId })
        : host.createRewardedVideoAd!({ adUnitId, multiton: true, disableFallbackSharePage: true });
    } catch (_) {
      return Promise.resolve('unavailable');
    }

    return new Promise(resolve => {
      let finished = false;
      let showing = false;
      let displayed = false;
      let closeResult: AdOutcome | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stopTimer = (): void => {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
      };
      const finish = (outcome: AdOutcome): void => {
        if (finished) return;
        finished = true;
        stopTimer();
        this.cancel = undefined;
        try { ad.offClose(onClose); } catch (_) { /* Native instance may already be gone. */ }
        try { ad.offError?.(onError); } catch (_) { /* Native instance may already be gone. */ }
        try { ad.destroy(); } catch (_) { /* Native instance may already be gone. */ }
        if (showing) {
          try { this.onDisplayChange?.(false); } catch (_) { /* Audio recovery cannot block the ad result. */ }
        }
        resolve(outcome);
      };
      const finalizeClose = (): void => {
        if (displayed && closeResult) finish(current() ? closeResult : 'unavailable');
      };
      const onClose: AdClose = result => {
        if (!showing || closeResult || finished) return;
        closeResult = interstitial || result?.isEnded === true ? 'complete' : 'skipped';
        finalizeClose();
      };
      const onError = (): void => finish('unavailable');
      this.cancel = () => finish('unavailable');
      try {
        ad.onClose(onClose);
        ad.onError?.(onError);
      } catch (_) { finish('unavailable'); return; }
      if (finished) return;
      if (typeof setTimeout === 'function') timer = setTimeout(() => finish('unavailable'), AD_OPEN_TIMEOUT);
      Promise.resolve().then(async () => {
        if (finished || !current()) { finish('unavailable'); return; }
        await ad.load();
        if (finished || !current()) { finish('unavailable'); return; }
        showing = true;
        this.onDisplayChange?.(true);
        await ad.show();
        if (finished) return;
        stopTimer();
        displayed = true;
        finalizeClose();
      }).catch(() => finish('unavailable'));
    });
  }

  destroy(): void {
    this.disposed = true;
    this.cancel?.();
  }
}
