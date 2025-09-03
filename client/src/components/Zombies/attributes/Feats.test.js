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

async function renderWithFeat(featData) {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => [featData],
  });
  const form = { feat: [], occupation: [{ Level: 4, Name: 'Fighter' }] };
  render(<Feats form={form} showFeats={true} handleCloseFeats={() => {}} />);
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
