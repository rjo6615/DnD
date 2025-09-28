import React from 'react';
import PropTypes from 'prop-types';

const extractLegendEntries = (legend) => {
  if (!legend || typeof legend !== 'object') {
    return [];
  }

  if (Array.isArray(legend)) {
    return legend
      .map((entry) => {
        if (!entry) {
          return null;
        }

        if (Array.isArray(entry)) {
          const [symbol, description] = entry;
          return {
            symbol: symbol === undefined || symbol === null ? '' : String(symbol),
            description:
              description === undefined || description === null
                ? ''
                : String(description),
          };
        }

        if (typeof entry === 'object') {
          return {
            symbol:
              entry.symbol === undefined || entry.symbol === null
                ? ''
                : String(entry.symbol),
            description:
              entry.description === undefined || entry.description === null
                ? ''
                : String(entry.description),
          };
        }

        return {
          symbol: '',
          description: String(entry),
        };
      })
      .filter(Boolean);
  }

  return Object.entries(legend).map(([symbol, description]) => ({
    symbol: symbol === undefined || symbol === null ? '' : String(symbol),
    description:
      description === undefined || description === null ? '' : String(description),
  }));
};

const normalizeGrid = (grid) => {
  if (!Array.isArray(grid)) {
    return [];
  }

  return grid
    .map((row) => {
      if (!Array.isArray(row)) {
        return [];
      }

      return row.map((cell) => (cell === undefined || cell === null ? '' : String(cell)));
    })
    .filter((row) => row.length > 0);
};

const MapDisplay = ({ map }) => {
  const safeMap = map && typeof map === 'object' ? map : {};
  const title =
    typeof safeMap.title === 'string' && safeMap.title.trim() !== ''
      ? safeMap.title.trim()
      : null;
  const summary =
    typeof safeMap.summary === 'string' && safeMap.summary.trim() !== ''
      ? safeMap.summary.trim()
      : null;
  const grid = normalizeGrid(safeMap.grid);
  const legendEntries = extractLegendEntries(safeMap.legend);

  return (
    <div className="map-display">
      {title && <h5 className="map-display__title">{title}</h5>}
      {grid.length > 0 ? (
        <div className="map-display__grid-wrapper" role="table" aria-label="Campaign map grid">
          <table className="map-display__grid">
            <tbody>
              {grid.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} className="map-display__cell">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted mb-0">No map grid available.</p>
      )}
      {legendEntries.length > 0 && (
        <div className="map-display__legend mt-3">
          <h6>Legend</h6>
          <ul className="map-display__legend-list">
            {legendEntries.map(({ symbol, description }, index) => (
              <li key={`legend-${index}`} className="map-display__legend-item">
                <span className="map-display__legend-symbol">{symbol || '—'}</span>
                <span className="map-display__legend-description">{description || 'No description'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary && (
        <div className="map-display__summary mt-3">
          <h6>Summary</h6>
          {summary.split('\n').map((paragraph, index) => (
            <p key={`summary-${index}`} className="mb-2">
              {paragraph}
            </p>
          ))}
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
