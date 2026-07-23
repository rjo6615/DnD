import React from 'react';
import { render, screen, act, within } from '@testing-library/react';
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
      formatAttackBonus: undefined,
      getEnemyActionDamageString: undefined,
      onEnemyDamageRoll: undefined,
      latestEnemyRoll: undefined,
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

  it('highlights the active enemy card', () => {
    renderList({ summaries: [{ ...baseSummary, isActiveTurn: true }] });

    const card = screen.getByTestId('active-map-enemy-card');
    expect(card).toHaveClass('enemy-quick-card--active-turn');
    expect(screen.getByText('Active Turn')).toBeInTheDocument();
  });

  it('moves the active turn enemy to the top of the visible list', () => {
    renderList({
      summaries: [
        {
          ...baseSummary,
          enemy: { ...baseSummary.enemy, enemyId: 'enemy-1', name: 'Goblin' },
          isActiveTurn: false,
        },
        {
          ...baseSummary,
          enemy: { ...baseSummary.enemy, enemyId: 'enemy-2', name: 'Owlbear' },
          isActiveTurn: true,
        },
        {
          ...baseSummary,
          enemy: { ...baseSummary.enemy, enemyId: 'enemy-3', name: 'Skeleton' },
          isActiveTurn: false,
        },
      ],
    });

    const cards = screen.getAllByTestId('active-map-enemy-card');
    expect(within(cards[0]).getByText('Owlbear')).toBeInTheDocument();
    expect(cards[0]).toHaveClass('enemy-quick-card--active-turn');
    expect(within(cards[1]).getByText('Goblin')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Skeleton')).toBeInTheDocument();
  });

  it('displays attack actions within a modal when available', async () => {
    const formatAttackBonus = jest.fn((bonus) => (bonus >= 0 ? `+${bonus}` : `${bonus}`));
    const getEnemyActionDamageString = jest.fn((action) =>
      action?.name === 'Scimitar' ? '1d6 slashing' : null
    );
    const onEnemyDamageRoll = jest.fn();
    const onEnemyAttackRoll = jest.fn();
    const latestEnemyRoll = {
      enemyId: 'enemy-1',
      actionName: 'Scimitar',
      total: 11,
      breakdown: '1d6 (8) + 3',
    };

    const props = renderList({
      formatAttackBonus,
      getEnemyActionDamageString,
      onEnemyDamageRoll,
      onEnemyAttackRoll,
      latestEnemyRoll,
      summaries: [
        {
          ...baseSummary,
          enemy: {
            ...baseSummary.enemy,
            actions: [
              { name: 'Scimitar', attack_bonus: 4 },
              { name: 'Hide' },
            ],
          },
        },
      ],
    });

    const attacksButton = screen.getByRole('button', { name: /View Attacks/i });
    await act(async () => {
      await userEvent.click(attacksButton);
    });

    const dialog = await screen.findByRole('dialog', { name: /Goblin Attacks/i });
    expect(within(dialog).getByText('Attacks')).toBeInTheDocument();
    expect(within(dialog).getByText('Scimitar')).toBeInTheDocument();
    expect(within(dialog).getByText('Attack Bonus')).toBeInTheDocument();
    expect(within(dialog).getByText('+4')).toBeInTheDocument();
    expect(within(dialog).getByText('Damage')).toBeInTheDocument();
    expect(within(dialog).getByText('1d6 slashing')).toBeInTheDocument();

    expect(within(dialog).getByRole('button', { name: /Roll attack for Scimitar/i })).toHaveTextContent('🎲 Roll Attack');
    const rollButton = within(dialog).getByRole('button', { name: /Roll damage for Scimitar/i });
    await act(async () => {
      await userEvent.click(rollButton);
    });

    expect(props.onEnemyDamageRoll).toHaveBeenCalledWith(
      expect.objectContaining({ enemyId: 'enemy-1' }),
      expect.objectContaining({ name: 'Scimitar' })
    );
    await userEvent.click(attacksButton);
    expect(await screen.findByText('Damage: 11 (1d6 (8) + 3)')).toBeInTheDocument();
  });
});
