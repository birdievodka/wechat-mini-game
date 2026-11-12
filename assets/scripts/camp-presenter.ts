import { Run, Stats, Upgrade, statsFor, totalBonus } from './campaign';

const percentKeys = ['damage', 'haste', 'speed', 'crit', 'area'];
export const formatStat = (value: number): string => String(Number(value.toFixed(1)));
export function upgradePresentation(run: Run, upgrade: Upgrade): { amount: string; label: string; before: string; after: string } {
  const next: Run = { ...run, bonus: { ...run.bonus, [upgrade.key]: run.bonus[upgrade.key] + upgrade.amount } };
  const current = statsFor(run), future = statsFor(next);
  const value = (s: Stats): string => {
    switch (upgrade.key) {
      case 'hp': return formatStat(s.maxHp);
      case 'power': return formatStat(totalBonus(s === current ? run : next).power);
      case 'melee': case 'ranged': case 'magic': return formatStat(totalBonus(s === current ? run : next)[upgrade.key]);
      case 'damage': return Math.round(totalBonus(s === current ? run : next).damage * 100) + '%';
      case 'haste': return hasteText(s === current ? run : next);
      case 'speed': return String(Math.round(s.speed));
      case 'crit': return Math.round(totalBonus(s === current ? run : next).crit * 100) + '%';
      case 'area': return Math.round(totalBonus(s === current ? run : next).area * 100) + '%';
      case 'range': return formatStat(totalBonus(s === current ? run : next).range);
      case 'armor': case 'regen': case 'pickup': return formatStat(s[upgrade.key]);
      default: return '';
    }
  };
  return { amount: '+' + (percentKeys.indexOf(upgrade.key) >= 0 ? Math.round(upgrade.amount * 100) + '%' : formatStat(upgrade.amount)),
    label: upgrade.key === 'haste' ? '攻击速度' : upgrade.key === 'hp' ? '最大生命' : upgrade.desc, before: value(current), after: value(future) };
}
export const hasteText = (run: Run): string => {
  const value = Math.round(Math.max(-.4, Math.min(1.5, totalBonus(run).haste)) * 100);
  return (value >= 0 ? '+' : '') + value + '%';
};
