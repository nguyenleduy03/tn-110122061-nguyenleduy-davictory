import { describe, it, expect } from 'vitest'
import {
  roundToNearestHalfBand,
  calculateExamBand,
  calculateWritingBandFromCriteria,
  formatBand,
} from '../utils/ieltsScoring'

describe('roundToNearestHalfBand', () => {
  it('rounds to nearest 0.5', () => {
    expect(roundToNearestHalfBand(6.25)).toBe(6.5)
    expect(roundToNearestHalfBand(6.0)).toBe(6.0)
    expect(roundToNearestHalfBand(6.74)).toBe(6.5)
    expect(roundToNearestHalfBand(6.75)).toBe(7.0)
  })

  it('clamps between 0 and 9', () => {
    expect(roundToNearestHalfBand(-1)).toBe(0)
    expect(roundToNearestHalfBand(10)).toBe(9)
  })

  it('returns null for invalid input', () => {
    expect(roundToNearestHalfBand('abc')).toBe(null)
    expect(roundToNearestHalfBand(undefined)).toBe(null)
  })
})

describe('calculateExamBand', () => {
  it('returns correct band for LISTENING', () => {
    expect(calculateExamBand({ skillType: 'LISTENING', totalCorrect: 40 })).toBe(9.0)
    expect(calculateExamBand({ skillType: 'LISTENING', totalCorrect: 30 })).toBe(7.0)
    expect(calculateExamBand({ skillType: 'LISTENING', totalCorrect: 23 })).toBe(6.0)
    expect(calculateExamBand({ skillType: 'LISTENING', totalCorrect: 0 })).toBe(0.0)
  })

  it('returns correct band for READING', () => {
    expect(calculateExamBand({ skillType: 'READING', totalCorrect: 39 })).toBe(9.0)
    expect(calculateExamBand({ skillType: 'READING', totalCorrect: 30 })).toBe(7.0)
    expect(calculateExamBand({ skillType: 'READING', totalCorrect: 0 })).toBe(0.0)
  })

  it('returns null for invalid skill', () => {
    expect(calculateExamBand({ skillType: 'WRITING', totalCorrect: 20 })).toBe(null)
  })
})

describe('calculateWritingBandFromCriteria', () => {
  it('calculates average rounded to half', () => {
    expect(calculateWritingBandFromCriteria({
      taskAchievement: 6, coherenceCohesion: 7,
      lexicalResource: 6, grammaticalRange: 6,
    })).toBe(6.5)
  })

  it('returns null if any criterion is null', () => {
    expect(calculateWritingBandFromCriteria({
      taskAchievement: 6, coherenceCohesion: null,
      lexicalResource: 6, grammaticalRange: 6,
    })).toBe(null)
  })
})

describe('formatBand', () => {
  it('formats to 1 decimal', () => {
    expect(formatBand(6.5)).toBe('6.5')
    expect(formatBand(7)).toBe('7.0')
  })

  it('returns N/A for invalid', () => {
    expect(formatBand('abc')).toBe('N/A')
  })
})
