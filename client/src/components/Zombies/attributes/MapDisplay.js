import React from 'react';
import PropTypes from 'prop-types';
import resolveMapImageSource from '../utils/mapImages';

const normalizeText = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const MapDisplay = ({ map }) => {
  const safeMap = map && typeof map === 'object' ? map : {};
  const title = normalizeText(safeMap.title);
  const altText =
    normalizeText(safeMap.altText) ||
    title ||
    normalizeText(safeMap.prompt) ||
    'Campaign map image';
  const imageSrc = resolveMapImageSource(safeMap);

  return (
    <div className="map-display">
      {title && <h5 className="map-display__title">{title}</h5>}
      {imageSrc ? (
        <div className="map-display__image-wrapper text-center">
          <img
            src={imageSrc}
            alt={altText}
            className="map-display__image img-fluid rounded"
          />
          <div className="map-display__grid-overlay" aria-hidden="true" />
        </div>
      ) : (
        <p className="text-muted mb-0">No map image available.</p>
      )}
    </div>
  );
};

MapDisplay.propTypes = {
  map: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

MapDisplay.defaultProps = {
  map: null,
};

export default MapDisplay;
