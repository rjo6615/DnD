import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Skills from './Skills';

let capturedModalProps;

jest.mock('react-bootstrap', () => {
  const actual = jest.requireActual('react-bootstrap');
  return {
    ...actual,
    Modal: ({ children, ...props }) => {
      if (!props.show) return null;
      capturedModalProps = props;
      return <div data-testid="mock-modal">{children}</div>;
    },
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'test-id' }),
}));

jest.mock('../../../utils/diceBoxManager', () => ({
  rollDiceWithBox: jest.fn().mockResolvedValue({ rolls: [[12]] }),
  setDiceBoxThemeColor: jest.fn(),
}));

const { rollDiceWithBox, setDiceBoxThemeColor } = require(
  '../../../utils/diceBoxManager'
);

const createProps = (overrides = {}) => ({
  form: {
    diceColor: '#123456',
    skills: {},
    race: {},
    background: {},
    feat: [],
    item: [],
    armor: [],
    weapon: [],
    equipment: {},
    proficiencyPoints: 0,
    expertisePoints: 0,
  },
  showSkill: true,
  handleCloseSkill: jest.fn(),
  totalLevel: 0,
  strMod: 0,
  dexMod: 0,
  conMod: 0,
  intMod: 0,
  chaMod: 0,
  wisMod: 0,
  onSkillsChange: jest.fn(),
  onRollResult: jest.fn(),
  ...overrides,
});

const createPrimalKnowledgeProps = (overrides = {}) =>
  createProps({
    totalLevel: 5,
    strMod: 4,
    dexMod: 2,
    form: {
      ...createProps().form,
      skills: {
        stealth: { proficient: true, expertise: true },
      },
      occupation: [{ Name: 'Barbarian', Level: 5 }],
      classState: {
        barbarian: {
          rage: { active: true, current: 1 },
        },
      },
    },
    ...overrides,
  });

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('Skills modal docking props', () => {
  beforeEach(() => {
    capturedModalProps = null;
    rollDiceWithBox.mockClear();
    setDiceBoxThemeColor.mockClear();
  });

  it('applies docked layout when docked', () => {
    render(<Skills {...createProps({ isDocked: true, dockedSide: 'left' })} />);

    expect(capturedModalProps).not.toBeNull();
    expect(capturedModalProps.dialogClassName).toContain('docked-modal');
    expect(capturedModalProps.dialogClassName).toContain('docked-modal--left');
    expect(capturedModalProps.centered).toBe(false);
    expect(capturedModalProps.backdrop).toBe(false);
    expect(capturedModalProps.enforceFocus).toBe(false);
  });

  it('uses default modal layout when not docked', () => {
    render(<Skills {...createProps()} />);

    expect(capturedModalProps).not.toBeNull();
    expect(capturedModalProps.dialogClassName).toBeUndefined();
    expect(capturedModalProps.centered).toBe(true);
    expect(capturedModalProps.backdrop).toBe(true);
    expect(capturedModalProps.enforceFocus).toBe(true);
  });
});

describe('skill rolling behavior', () => {
  beforeEach(() => {
    rollDiceWithBox.mockClear();
    setDiceBoxThemeColor.mockClear();
  });

  it('closes the modal after rolling when undocked', async () => {
    const handleCloseSkill = jest.fn();
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    rollDiceWithBox.mockResolvedValueOnce({ rolls: [[17]] });

    render(<Skills {...createProps({ handleCloseSkill })} />);

    try {
      const rollButton = await screen.findByRole('button', { name: /roll acrobatics/i });
      await userEvent.click(rollButton);

      expect(handleCloseSkill).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        const rollEventCall = dispatchSpy.mock.calls.find(
          ([event]) => event?.type === 'damage-roll'
        );
        expect(rollEventCall).toBeDefined();
      });
    } finally {
      dispatchSpy.mockRestore();
    }
  });

  it('keeps the modal open after rolling when docked', async () => {
    const handleCloseSkill = jest.fn();
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    rollDiceWithBox.mockResolvedValueOnce({ rolls: [[9]] });

    render(
      <Skills
        {...createProps({ handleCloseSkill, isDocked: true, dockedSide: 'left' })}
      />
    );

    try {
      const rollButton = await screen.findByRole('button', { name: /roll acrobatics/i });
      await userEvent.click(rollButton);

      expect(handleCloseSkill).not.toHaveBeenCalled();

      await waitFor(() => {
        const rollEventCall = dispatchSpy.mock.calls.find(
          ([event]) => event?.type === 'damage-roll'
        );
        expect(rollEventCall).toBeDefined();
      });
    } finally {
      dispatchSpy.mockRestore();
    }
  });

  it('closes both modals immediately before resolving a normal Primal Knowledge ability roll', async () => {
    const handleCloseSkill = jest.fn();
    const pendingRoll = deferred();
    rollDiceWithBox.mockReturnValueOnce(pendingRoll.promise);

    render(<Skills {...createPrimalKnowledgeProps({ handleCloseSkill })} />);

    await userEvent.click(await screen.findByRole('button', { name: /roll stealth/i }));
    expect(screen.getByText(/choose modifier/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^roll$/i }));

    expect(screen.queryByText(/choose modifier/i)).not.toBeInTheDocument();
    expect(handleCloseSkill).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(rollDiceWithBox).toHaveBeenCalledTimes(1));

    pendingRoll.resolve({ rolls: [[12, 12]] });
    await waitFor(() => expect(rollDiceWithBox).toHaveBeenCalledTimes(1));
  });

  it('closes both modals immediately before resolving a Strength Primal Knowledge roll and preserves roll context', async () => {
    const handleCloseSkill = jest.fn();
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    const pendingRoll = deferred();
    rollDiceWithBox.mockReturnValueOnce(pendingRoll.promise);

    render(<Skills {...createPrimalKnowledgeProps({ handleCloseSkill })} />);

    await userEvent.click(await screen.findByRole('button', { name: /roll stealth/i }));
    await userEvent.selectOptions(screen.getByLabelText(/modifier/i), 'str');
    await userEvent.click(screen.getByRole('button', { name: /^roll$/i }));

    expect(screen.queryByText(/choose modifier/i)).not.toBeInTheDocument();
    expect(handleCloseSkill).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(rollDiceWithBox).toHaveBeenCalledTimes(1));

    pendingRoll.resolve({ rolls: [[12, 12]] });

    await waitFor(() => {
      const rollEventCall = dispatchSpy.mock.calls.find(
        ([event]) => event?.type === 'damage-roll'
      );
      expect(rollEventCall?.[0].detail).toEqual(
        expect.objectContaining({
          value: 22,
          source: 'Strength (Stealth) — Primal Knowledge',
        })
      );
      expect(rollEventCall?.[0].detail.breakdown).toContain('+ 4 Strength Modifier');
      expect(rollEventCall?.[0].detail.breakdown).toContain('+ 6 Expertise Bonus');
    });

    dispatchSpy.mockRestore();
  });

  it('does not roll or close the parent Skills modal when cancelling the modifier prompt', async () => {
    const handleCloseSkill = jest.fn();

    render(<Skills {...createPrimalKnowledgeProps({ handleCloseSkill })} />);

    await userEvent.click(await screen.findByRole('button', { name: /roll stealth/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByText(/choose modifier/i)).not.toBeInTheDocument();
    expect(handleCloseSkill).not.toHaveBeenCalled();
    expect(rollDiceWithBox).not.toHaveBeenCalled();
  });

  it('keeps existing eligible-skill checks by rolling ineligible Rage skills without the modifier prompt', async () => {
    const handleCloseSkill = jest.fn();
    rollDiceWithBox.mockResolvedValueOnce({ rolls: [[11, 11]] });

    render(<Skills {...createPrimalKnowledgeProps({ handleCloseSkill })} />);

    await userEvent.click(await screen.findByRole('button', { name: /roll athletics/i }));

    expect(screen.queryByText(/choose modifier/i)).not.toBeInTheDocument();
    expect(handleCloseSkill).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(rollDiceWithBox).toHaveBeenCalledTimes(1));
  });

  it('applies the player dice color before rolling', async () => {
    rollDiceWithBox.mockResolvedValueOnce({ rolls: [[8]] });

    render(<Skills {...createProps()} />);

    const rollButton = await screen.findByRole('button', { name: /roll acrobatics/i });
    await userEvent.click(rollButton);

    await waitFor(() => {
      expect(setDiceBoxThemeColor).toHaveBeenCalledWith('#123456');
    });
  });
});
