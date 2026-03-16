import { describe, it, expect } from 'vitest';
import {
  getStatusLabel,
  getAufwandLabel,
  STATUS_LABELS,
  TASK_STATUSES,
  AUFWAND_OPTIONS,
} from './index';

describe('getStatusLabel', () => {
  it('returns German label for known status', () => {
    expect(getStatusLabel('Backlog')).toBe('Backlog');
    expect(getStatusLabel('To Do')).toBe('Zu erledigen');
    expect(getStatusLabel('In Progress')).toBe('In Bearbeitung');
    expect(getStatusLabel('Review')).toBe('Überprüfung');
    expect(getStatusLabel('Done')).toBe('Erledigt');
  });

  it('returns status as fallback for unknown status', () => {
    expect(getStatusLabel('Unknown' as any)).toBe('Unknown');
  });
});

describe('getAufwandLabel', () => {
  it('returns label for known story points', () => {
    expect(getAufwandLabel(1)).toBe('Sehr klein');
    expect(getAufwandLabel(2)).toBe('Klein');
    expect(getAufwandLabel(3)).toBe('Mittel');
    expect(getAufwandLabel(5)).toBe('Groß');
    expect(getAufwandLabel(8)).toBe('Sehr groß');
  });

  it('returns number as string for unknown points', () => {
    expect(getAufwandLabel(4)).toBe('4');
    expect(getAufwandLabel(13)).toBe('13');
  });
});

describe('TASK_STATUSES', () => {
  it('contains all expected statuses', () => {
    expect(TASK_STATUSES).toEqual(['Backlog', 'To Do', 'In Progress', 'Review', 'Done']);
  });
});

describe('STATUS_LABELS', () => {
  it('has label for each task status', () => {
    for (const status of TASK_STATUSES) {
      expect(STATUS_LABELS[status]).toBeDefined();
      expect(typeof STATUS_LABELS[status]).toBe('string');
    }
  });
});

describe('AUFWAND_OPTIONS', () => {
  it('contains value and label for each option', () => {
    expect(AUFWAND_OPTIONS.length).toBeGreaterThan(0);
    for (const opt of AUFWAND_OPTIONS) {
      expect(typeof opt.value).toBe('number');
      expect(typeof opt.label).toBe('string');
    }
  });
});
