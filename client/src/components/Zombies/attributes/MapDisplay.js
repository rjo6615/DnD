import React from 'react';
import PropTypes from 'prop-types';

const buildImageSource = ({ imageUrl, imageBase64, imageType }) => {
  if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
    return imageUrl.trim();
  }

  if (typeof imageBase64 === 'string' && imageBase64.trim() !== '') {
    const mimeType =
      typeof imageType === 'string' && imageType.trim() !== ''
        ? imageType.trim()
        : 'image/png';
    return `data:${mimeType};base64,${imageBase64.trim()}`;
  }

  return null;
};

const normalizeText = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const renderParagraphs = (text) => {
  if (!text) {
    return null;
  }

  return text.split('\n').map((paragraph, index) => (
    <p key={`summary-${index}`} className="mb-2">
      {paragraph}
    </p>
  ));
};

const MapDisplay = ({ map }) => {
  const safeMap = map && typeof map === 'object' ? map : {};
  const title = normalizeText(safeMap.title);
  const caption = normalizeText(safeMap.caption);
  const summary = normalizeText(safeMap.summary);
  const altText =
    normalizeText(safeMap.altText) ||
    title ||
    caption ||
    summary ||
    normalizeText(safeMap.prompt) ||
    'Campaign map image';
  const imageSrc = buildImageSource(safeMap);

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
          {caption && (
            <p className="map-display__caption text-muted mt-2 mb-0">{caption}</p>
          )}
        </div>
      ) : (
        <p className="text-muted mb-0">No map image available.</p>
      )}
      {summary && (
        <div className="map-display__summary mt-3">
          <h6>Summary</h6>
          {renderParagraphs(summary)}
        </div>
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
