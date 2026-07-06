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

export function BottomSheet({ className, children, ...props }) {
  return <Panel className={join('hud-bottom-sheet', className)} {...props}>{children}</Panel>;
}
