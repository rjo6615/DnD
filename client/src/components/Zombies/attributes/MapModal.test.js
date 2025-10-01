import React from 'react';
import { render } from '@testing-library/react';
import MapModal from './MapModal';

let capturedModalProps;

jest.mock('react-bootstrap', () => {
  const actual = jest.requireActual('react-bootstrap');
  const ModalMock = Object.assign(
    ({ children, ...props }) => {
      capturedModalProps = props;
      return (
        <div data-testid="mock-modal">
          {children}
        </div>
      );
    },
    {
      Header: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
      Title: ({ children }) => <div>{children}</div>,
    }
  );

  return {
    ...actual,
    Modal: ModalMock,
  };
});

describe('MapModal docking props', () => {
  beforeEach(() => {
    capturedModalProps = null;
  });

  it('applies docked dialog class and disables backdrop when docked', () => {
    render(<MapModal show isDocked dockedSide="right" />);

    expect(capturedModalProps).not.toBeNull();
    expect(capturedModalProps.dialogClassName).toContain('docked-modal');
    expect(capturedModalProps.dialogClassName).toContain('docked-modal--right');
    expect(capturedModalProps.centered).toBe(false);
    expect(capturedModalProps.backdrop).toBe(false);
    expect(capturedModalProps.enforceFocus).toBe(false);
  });

  it('uses default modal behavior when not docked', () => {
    render(<MapModal show />);

    expect(capturedModalProps).not.toBeNull();
    expect(capturedModalProps.dialogClassName).toBeUndefined();
    expect(capturedModalProps.centered).toBe(true);
    expect(capturedModalProps.backdrop).toBe(true);
    expect(capturedModalProps.enforceFocus).toBe(true);
  });
});
