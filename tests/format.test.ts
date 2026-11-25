import { describe, expect, it } from 'vitest';
import { fmt, percent, span, suffix } from '../src/game/format';

describe('how a number is written', () => {
  it('is whole under a thousand, and three figures with a letter above', () => {
    expect(fmt(0)).toBe('0');
    expect(fmt(7)).toBe('7');
    expect(fmt(999)).toBe('999');
    expect(fmt(1000)).toBe('1.00K');
    expect(fmt(1234)).toBe('1.23K');
    expect(fmt(45_600)).toBe('45.6K');
    expect(fmt(789_000)).toBe('789K');
    expect(fmt(1_234_567)).toBe('1.23M');
    expect(fmt(4.2e9)).toBe('4.20B');
    expect(fmt(3e12)).toBe('3.00T');
  });

  it('takes two letters past a trillion, and they go on', () => {
    expect(suffix(5)).toBe('aa');
    expect(suffix(6)).toBe('ab');
    expect(suffix(5 + 26)).toBe('ba');
    expect(fmt(7.7e15)).toBe('7.70aa');
    expect(fmt(1e18)).toBe('1.00ab');
    expect(fmt(1e300)).toMatch(/^\d\.\d\d[a-z][a-z]$/);
  });

  it('never shows more of a purse than is in it, nor less of a price than it costs', () => {
    expect(fmt(1999)).toBe('1.99K');
    expect(fmt(1999, true)).toBe('2.00K');
    expect(fmt(999.4, true)).toBe('1000');
    expect(fmt(999_999)).toBe('999K');
    expect(fmt(999_999, true)).toBe('1.00M');
    expect(fmt(12.3)).toBe('12');
    expect(fmt(12.3, true)).toBe('13');
    // A whole number is itself either way.
    for (const n of [1, 10, 250, 1000, 25_000, 6_000_000]) expect(fmt(n, true)).toBe(fmt(n));
  });

  it('has something to say of what is not a number', () => {
    expect(fmt(Infinity)).toBe('MAX');
    expect(fmt(-1500)).toBe('-1.50K');
  });

  it('writes time and shares shortly', () => {
    expect(span(45)).toBe('45s');
    expect(span(200)).toBe('3m 20s');
    expect(span(9000)).toBe('2h 30m');
    expect(span(-5)).toBe('0s');
    expect(percent(0.15)).toBe('15%');
    expect(percent(0.025)).toBe('2.5%');
    expect(percent(2)).toBe('200%');
  });
});
