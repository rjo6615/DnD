import React from 'react';
import { render } from '@testing-library/react';
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

const createProps = (overrides = {}) => ({
  form: {
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
