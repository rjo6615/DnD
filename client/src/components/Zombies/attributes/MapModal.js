import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import MapDisplay from './MapDisplay';

const MapModal = ({ show, onHide, map }) => (
  <Modal show={show} onHide={onHide} size="lg" centered>
    <Modal.Header closeButton>
      <Modal.Title>Campaign Map</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <MapDisplay map={map} />
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onHide}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
);

MapModal.propTypes = {
  show: PropTypes.bool,
  onHide: PropTypes.func,
  map: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

MapModal.defaultProps = {
  show: false,
  onHide: () => {},
  map: null,
};

export default MapModal;
