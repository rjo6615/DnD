import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveEnemyQuickList } from './ActiveEnemyQuickList';

describe('ActiveEnemyQuickList', () => {
  const baseSummary = {
    enemy: { enemyId: 'enemy-1', name: 'Goblin', displayType: 'humanoid' },
    challengeText: 'CR 1/4',
    sizeDisplay: 'Small',
    armorClassDisplay: '13',
    maxHpValue: 12,
    resolvedCurrentHp: 9,
    healthSummary: '9 / 12',
    inCombat: false,
  };

  const renderList = (overrides = {}) => {
    const props = {
      summaries: [baseSummary],
      activeMapTitle: 'Dungeon Entrance',
      onManageEnemies: jest.fn(),
      onResetInitiative: jest.fn(),
      onRollInitiative: jest.fn(),
      onAdvanceTurn: jest.fn(),
      combatControlsDisabled: false,
      onToggleParticipant: jest.fn(),
      onOpenMapPlacement: jest.fn(),
      onViewDetails: jest.fn(),
      enemyHealthAdjustments: { 'enemy-1': '' },
      enemyHealthSaving: {},
      onEnemyAdjustmentInputChange: jest.fn(),
      onApplyEnemyHealthAdjustment: jest.fn(),
      onResetEnemyHealth: jest.fn(),
      ...overrides,
    };

    render(<ActiveEnemyQuickList {...props} />);
    return props;
  };

  it('renders a condensed list with header context and manage button', async () => {
    const props = renderList();

    expect(screen.getByText('Active Map Enemies')).toBeInTheDocument();
    expect(screen.getByText('1 enemy deployed • Dungeon Entrance')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Manage Enemies/i }));

    expect(props.onManageEnemies).toHaveBeenCalledTimes(1);
  });

  it('allows the condensed list to be collapsed and expanded', async () => {
    renderList();

    const list = screen.getByTestId('active-map-enemies-list');
    expect(list).toBeVisible();

    const collapseButton = screen.getByRole('button', {
      name: /Collapse active enemy display/i,
    });
    await act(async () => {
      await userEvent.click(collapseButton);
    });

    expect(screen.getByRole('button', { name: /Expand active enemy display/i })).toBeInTheDocument();
    expect(list).not.toBeVisible();

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Expand active enemy display/i }));
    });

    expect(list).toBeVisible();
  });

  it('exposes combat control buttons when callbacks are provided', async () => {
    const props = renderList();

    await userEvent.click(screen.getByRole('button', { name: /Clear Initiative/i }));
    expect(props.onResetInitiative).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: /Roll Initiative/i }));
    expect(props.onRollInitiative).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: /Previous Turn/i }));
    expect(props.onAdvanceTurn).toHaveBeenCalledWith(-1);

    await userEvent.click(screen.getByRole('button', { name: /Next Turn/i }));
    expect(props.onAdvanceTurn).toHaveBeenCalledWith(1);
  });

  it('exposes health controls for the condensed cards', async () => {
    const props = renderList();

    await userEvent.click(screen.getByRole('button', { name: 'Damage Goblin' }));
    expect(props.onApplyEnemyHealthAdjustment).toHaveBeenCalledWith('enemy-1', -1);

    await userEvent.click(screen.getByRole('button', { name: 'Heal Goblin' }));
    expect(props.onApplyEnemyHealthAdjustment).toHaveBeenCalledWith('enemy-1', 1);

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(props.onResetEnemyHealth).toHaveBeenCalledWith('enemy-1');

    const input = screen.getByLabelText('Health adjustment');
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    expect(props.onEnemyAdjustmentInputChange).toHaveBeenLastCalledWith('enemy-1', '5');
  });

  it('passes interaction callbacks for combat, placement, and details', async () => {
    const props = renderList();

    await userEvent.click(screen.getByRole('button', { name: /Add to Combat/i }));
    expect(props.onToggleParticipant).toHaveBeenCalledWith('enemy-1');

    await userEvent.click(screen.getByRole('button', { name: /Reposition/i }));
    expect(props.onOpenMapPlacement).toHaveBeenCalledWith('enemy-1', 'Goblin');

    await userEvent.click(screen.getByRole('button', { name: /Details/i }));
    expect(props.onViewDetails).toHaveBeenCalledWith('enemy-1');
  });

  it('renders nothing when summaries are empty', () => {
    renderList({ summaries: [] });
    expect(screen.queryByTestId('active-map-enemies')).not.toBeInTheDocument();
  });
});
