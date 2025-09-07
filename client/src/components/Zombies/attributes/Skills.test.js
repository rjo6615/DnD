import { rollSkill } from './Skills';

describe('rollSkill critical and fumble events', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('dispatches critical event on natural 20', () => {
    const listener = jest.fn();
    window.addEventListener('critical-hit', listener);
    jest.spyOn(Math, 'random').mockReturnValue(0.95); // yields 20
    rollSkill(0);
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].detail).toContain('critical');
    window.removeEventListener('critical-hit', listener);
  });

  test('dispatches fumble event on natural 1', () => {
    const listener = jest.fn();
    window.addEventListener('critical-failure', listener);
    jest.spyOn(Math, 'random').mockReturnValue(0); // yields 1
    rollSkill(0);
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].detail).toContain('fumble');
    window.removeEventListener('critical-failure', listener);
  });
});
