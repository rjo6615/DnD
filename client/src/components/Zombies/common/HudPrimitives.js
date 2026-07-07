import React from 'react';
import { Button as BootstrapButton } from 'react-bootstrap';

const join = (...classes) => classes.filter(Boolean).join(' ');

export function Panel({ as: Component = 'section', className, children, ...props }) {
  return <Component className={join('hud-panel', className)} {...props}>{children}</Component>;
}

export function Card({ as: Component = 'div', className, children, ...props }) {
  return <Component className={join('hud-card', className)} {...props}>{children}</Component>;
}

export function Button({ className, variant = 'ghost', children, ...props }) {
  return <BootstrapButton className={join('hud-button', `hud-button--${variant}`, className)} {...props}>{children}</BootstrapButton>;
}

export function IconButton({ className, label, children, ...props }) {
  return <Button className={join('hud-icon-button', className)} aria-label={label} title={label} {...props}>{children}</Button>;
}

export function Toolbar({ className, children, ...props }) {
  return <div className={join('hud-toolbar', className)} role="toolbar" {...props}>{children}</div>;
}

export function Dock({ className, children, ...props }) {
  return <nav className={join('hud-dock', className)} {...props}>{children}</nav>;
}

export function ResourceCounter({ icon, name, current, max, onMinus, onPlus, accent }) {
  return (
    <Card className="hud-resource-counter" style={{ '--hud-resource-accent': accent }}>
      <span className="hud-resource-counter__icon" aria-hidden="true">{icon}</span>
      <span className="hud-resource-counter__name">{name}</span>
      <strong className="hud-resource-counter__value">{current}/{max}</strong>
      <IconButton label={`Decrease ${name}`} className="hud-resource-counter__step" onClick={onMinus}>−</IconButton>
      <IconButton label={`Increase ${name}`} className="hud-resource-counter__step" onClick={onPlus}>+</IconButton>
    </Card>
  );
}

export function SectionHeader({ eyebrow, title, children, className }) {
  return <header className={join('hud-section-header', className)}>{eyebrow && <span>{eyebrow}</span>}<h3>{title}</h3>{children}</header>;
}

export function ModalShell({ className, children, ...props }) {
  return <Panel className={join('realm-modal-shell', className)} {...props}>{children}</Panel>;
}

export function ModalHeader({ title, subtitle, actions, onClose, className, children }) {
  return (
    <header className={join('realm-modal-header', className)}>
      <div className="realm-modal-header__titles">
        {subtitle && <span className="realm-modal-header__subtitle">{subtitle}</span>}
        {title && <h2 className="realm-modal-header__title">{title}</h2>}
      </div>
      {children && <div className="realm-modal-header__content">{children}</div>}
      {actions && <div className="realm-modal-header__actions">{actions}</div>}
      {onClose && <IconButton className="realm-modal-header__close" label="Close" onClick={onClose}>×</IconButton>}
    </header>
  );
}

export function ModalBody({ className, children, ...props }) {
  return <div className={join('realm-modal-body', className)} {...props}>{children}</div>;
}

export function ModalFooter({ className, children, ...props }) {
  return <footer className={join('realm-modal-footer', className)} {...props}>{children}</footer>;
}

export function Section({ as: Component = 'section', className, children, ...props }) {
  return <Component className={join('realm-section', className)} {...props}>{children}</Component>;
}

export function StatCard({ label, value, detail, className, children }) {
  return <Card className={join('realm-stat-card', className)}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}{children}</Card>;
}

export function ActionBar({ className, children, ...props }) {
  return <div className={join('realm-action-bar', className)} {...props}>{children}</div>;
}

export function Tabs({ className, children, ...props }) {
  return <div className={join('realm-tabs', className)} {...props}>{children}</div>;
}

export function Sidebar({ className, children, ...props }) {
  return <aside className={join('realm-sidebar', className)} {...props}>{children}</aside>;
}

export function SearchBar({ className, ...props }) {
  return <input className={join('realm-search-bar', className)} type="search" {...props} />;
}

export function ResourceChip({ className, children, ...props }) {
  return <span className={join('realm-resource-chip', className)} {...props}>{children}</span>;
}

export function InfoCard({ className, children, ...props }) {
  return <Card className={join('realm-info-card', className)} {...props}>{children}</Card>;
}

export function EmptyState({ title = 'Nothing here yet', children, className }) {
  return <div className={join('realm-empty-state', className)}><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}

export function ScrollablePanel({ className, children, ...props }) {
  return <div className={join('realm-scrollable-panel', className)} {...props}>{children}</div>;
}

export function BottomSheet({ className, children, ...props }) {
  return <Panel className={join('hud-bottom-sheet', className)} {...props}>{children}</Panel>;
}
