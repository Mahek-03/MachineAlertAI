import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RulBar } from '../components/ui/RulBar';
import { GaugeMeter } from '../components/ui/GaugeMeter';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { Layout } from '../components/layout/Layout';

describe('UI Component Unit Tests', () => {
  it('renders RiskBadge with correct color semantics', () => {
    const { rerender } = render(<RiskBadge level="Normal" />);
    expect(screen.getByText('Normal')).toBeInTheDocument();

    rerender(<RiskBadge level="Medium Risk" />);
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();

    rerender(<RiskBadge level="High Risk" />);
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('renders StatusBadge with correct status title', () => {
    const { rerender } = render(<StatusBadge status="Operational" />);
    expect(screen.getByText('Operational')).toBeInTheDocument();

    rerender(<StatusBadge status="Maintenance Required" />);
    expect(screen.getByText('Maintenance Required')).toBeInTheDocument();
  });

  it('renders RulBar with calculated remaining hours', () => {
    render(<RulBar rulMinutes={120} />);
    expect(screen.getByText('120.0')).toBeInTheDocument();
    expect(screen.getByText('minutes')).toBeInTheDocument();
    expect(screen.getByText('(~2.0 operational hours)')).toBeInTheDocument();
  });

  it('renders GaugeMeter with value and unit', () => {
    render(
      <GaugeMeter
        label="Spindle Torque"
        value={45.2}
        min={10}
        max={80}
        unit="Nm"
        warningThreshold={55}
        criticalThreshold={65}
      />
    );
    expect(screen.getByText('Spindle Torque')).toBeInTheDocument();
    expect(screen.getByText('45.2')).toBeInTheDocument();
    expect(screen.getByText('Nm')).toBeInTheDocument();
    expect(screen.getByText('Nominal')).toBeInTheDocument();
  });

  it('renders Sidebar logo and brand name as a clickable link navigating to /', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    const brandLink = screen.getByRole('link', { name: /go to home page/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute('href', '/');
    expect(brandLink).toHaveTextContent('MachineAlert');
    expect(brandLink).toHaveTextContent('AI');
  });

  it('renders Header brand link navigating to / when on home page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Header />
      </MemoryRouter>
    );

    const brandLinks = screen.getAllByRole('link', { name: /go to home page/i });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    expect(brandLinks[0]).toHaveAttribute('href', '/');
  });

  it('applies operations-layout class on Operations pages and omits it on Landing page', () => {
    const { container: opsContainer } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout />
      </MemoryRouter>
    );
    expect(opsContainer.querySelector('.operations-layout')).not.toBeNull();

    const { container: homeContainer } = render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );
    expect(homeContainer.querySelector('.operations-layout')).toBeNull();
  });
});
