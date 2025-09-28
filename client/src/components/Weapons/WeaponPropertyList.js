import React, { useMemo } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { normalizeWeaponProperties } from '../../constants/weaponProperties';

let idCounter = 0;

const getNextId = () => {
  idCounter += 1;
  return idCounter;
};

function WeaponPropertyList({ properties, className = '', emptyLabel = 'No properties', size = 'sm' }) {
  const normalized = useMemo(
    () => normalizeWeaponProperties(properties),
    [properties]
  );

  if (!normalized.length) {
    return (
      <div className={`weapon-property-row ${className}`.trim()} data-testid="weapon-property-row-empty">
        <span className="weapon-property-pill weapon-property-pill--empty">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className={`weapon-property-row ${className}`.trim()} data-testid="weapon-property-row">
      {normalized.map((info, index) => {
        const tooltipId = `weapon-prop-${info.key || 'custom'}-${getNextId()}`;
        const button = (
          <Button
            variant="link"
            size={size}
            className="weapon-property-pill__info"
            aria-label={info.description ? `Show description for ${info.label}` : `${info.label} has no additional description`}
            aria-disabled={info.description ? undefined : true}
            disabled={!info.description}
            tabIndex={info.description ? 0 : -1}
          >
            <i className="fa-solid fa-eye" aria-hidden="true" />
            <span className="visually-hidden">
              {info.description ? `Open description for ${info.label}` : `No description available for ${info.label}`}
            </span>
          </Button>
        );

        return (
          <span className="weapon-property-pill" key={`${info.key || info.label}-${index}`}>
            <span className="weapon-property-pill__label">{info.label}</span>
            {info.description ? (
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id={tooltipId}>{info.description}</Tooltip>}
                trigger={['hover', 'focus']}
              >
                {button}
              </OverlayTrigger>
            ) : (
              button
            )}
          </span>
        );
      })}
    </div>
  );
}

export default WeaponPropertyList;

