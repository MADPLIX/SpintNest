import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      currentView: 'projects',
      selectedProjectId: null,
      selectedSprintId: null,
      openProjectIds: [],
    });
  });

  it('setView updates currentView', () => {
    useStore.getState().setView('board');
    expect(useStore.getState().currentView).toBe('board');
  });

  it('setSelectedProject updates selectedProjectId and adds to openProjectIds', () => {
    useStore.getState().setSelectedProject('proj-1');
    expect(useStore.getState().selectedProjectId).toBe('proj-1');
    expect(useStore.getState().openProjectIds).toContain('proj-1');
  });

  it('addOpenProject adds project and sets as selected', () => {
    useStore.getState().addOpenProject('proj-2');
    expect(useStore.getState().selectedProjectId).toBe('proj-2');
    expect(useStore.getState().openProjectIds).toContain('proj-2');
  });

  it('removeOpenProject removes project from openProjectIds', () => {
    useStore.setState({ openProjectIds: ['a', 'b', 'c'], selectedProjectId: 'b' });
    useStore.getState().removeOpenProject('b');
    expect(useStore.getState().openProjectIds).toEqual(['a', 'c']);
    expect(useStore.getState().selectedProjectId).toBe('a');
  });

  it('showAlert sets alert state', () => {
    useStore.getState().showAlert('Test', 'success');
    expect(useStore.getState().alertState.open).toBe(true);
    expect(useStore.getState().alertState.message).toBe('Test');
    expect(useStore.getState().alertState.type).toBe('success');
  });

  it('closeAlert resets alert', () => {
    useStore.getState().showAlert('Test', 'error');
    useStore.getState().closeAlert();
    expect(useStore.getState().alertState.open).toBe(false);
    expect(useStore.getState().alertState.message).toBe('');
  });
});
