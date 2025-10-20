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
