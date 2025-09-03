import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Feats from './Feats';

jest.mock('../../../utils/apiFetch');
import apiFetch from '../../../utils/apiFetch';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: '1' }),
}));

async function renderWithFeat(featData, formOverrides = {}) {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => [featData],
  });
  const defaultForm = {
    feat: [],
    occupation: [{ Level: 4, Name: 'Fighter' }],
  };
  render(
    <Feats
      form={{ ...defaultForm, ...formOverrides }}
      showFeats={true}
      handleCloseFeats={() => {}}
    />
  );
  await screen.findByRole('option', { name: featData.featName });
  await userEvent.selectOptions(
    screen.getByRole('combobox'),
    featData.featName
  );
}

describe('Feats skill selection', () => {
  test('renders for skill choices', async () => {
    await renderWithFeat({ featName: 'SkillFeat', skillChoiceCount: 1 });
    expect(
      await screen.findByText('Skill/Tool Proficiencies')
    ).toBeInTheDocument();
  });

  test('renders for tool proficiencies', async () => {
    await renderWithFeat({ featName: 'ToolFeat', toolProficiencies: ['smithsTools'] });
    expect(
      await screen.findByText('Skill/Tool Proficiencies')
    ).toBeInTheDocument();
  });

  test('renders for Skilled feat', async () => {
    await renderWithFeat({ featName: 'Skilled' });
    expect(
      await screen.findByText('Skill/Tool Proficiencies')
    ).toBeInTheDocument();
  });
});

describe('Feats skill persistence', () => {
  test('keeps default and existing skills when re-editing', async () => {
    const featData = {
      featName: 'SkillFeat',
      skillChoiceCount: 3,
      skills: { stealth: { proficient: true } },
    };
    await renderWithFeat(featData, {
      feat: [{ featName: 'SkillFeat', skills: { acrobatics: { proficient: true } } }],
      occupation: [{ Level: 8, Name: 'Fighter' }],
    });
    expect(
      screen.getByRole('option', { name: 'Stealth' }).selected
    ).toBe(true);
    expect(
      screen.getByRole('option', { name: 'Acrobatics' }).selected
    ).toBe(true);
  });

  test('removes deselected skills', async () => {
    const featData = {
      featName: 'SkillFeat',
      skillChoiceCount: 3,
      skills: { stealth: { proficient: true } },
    };
    await renderWithFeat(featData);
    const select = screen.getByRole('listbox');
    await userEvent.selectOptions(select, 'Acrobatics');
    await userEvent.deselectOptions(select, 'Stealth');
    expect(
      screen.getByRole('option', { name: 'Stealth' }).selected
    ).toBe(false);
    expect(
      screen.getByRole('option', { name: 'Acrobatics' }).selected
    ).toBe(true);
  });
});
