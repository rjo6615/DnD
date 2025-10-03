import React from "react";
import { Button, Card, Form, Modal, Table } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function CampaignModals({
  playerCampaigns,
  dmCampaigns,
  showJoinCampaignModal,
  closeJoinCampaignModal,
  showHostCampaignModal,
  closeHostCampaignModal,
  showCreateCampaignModal,
  closeCreateCampaignModal,
  createCampaignForm,
  updateCreateCampaignForm,
  submitCreateCampaign,
}) {
  return (
    <>
      <Modal
        className="dnd-modal"
        centered
        show={showJoinCampaignModal}
        onHide={closeJoinCampaignModal}
      >
        <div className="text-center">
          <Card className="dnd-background">
            <Card.Title>Join Campaign</Card.Title>

            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Campaign Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {playerCampaigns.map((campaign) => (
                    <tr key={campaign.campaignName}>
                      <td>{campaign.campaignName}</td>
                      <td>
                        <Link
                          className="btn btn-link"
                          to={`/zombies-character-select/${campaign.campaignName}`}
                        >
                          <Button
                            style={{ borderColor: "transparent" }}
                            className="fantasy-button"
                            type="button"
                            onClick={closeJoinCampaignModal}
                          >
                            Join
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeJoinCampaignModal}>
                Close
              </Button>
            </Modal.Footer>
          </Card>
        </div>
      </Modal>

      <Modal
        className="dnd-modal"
        centered
        show={showHostCampaignModal}
        onHide={closeHostCampaignModal}
      >
        <div className="text-center">
          <Card className="dnd-background">
            <Card.Title>Host Campaign</Card.Title>

            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Campaign Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dmCampaigns.map((campaign) => (
                    <tr key={campaign.campaignName}>
                      <td>{campaign.campaignName}</td>
                      <td>
                        <Link
                          className="btn btn-link"
                          to={`/zombies-dm/${campaign.campaignName}`}
                        >
                          <Button
                            style={{ borderColor: "transparent" }}
                            className="hostCampaign"
                            type="button"
                            onClick={closeHostCampaignModal}
                          >
                            Host
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeHostCampaignModal}>
                Close
              </Button>
            </Modal.Footer>
          </Card>
        </div>
      </Modal>

      <Modal
        centered
        className="dnd-modal"
        show={showCreateCampaignModal}
        onHide={closeCreateCampaignModal}
      >
        <div className="text-center">
          <Card className="dnd-background">
            <Card.Title>Create Campaign</Card.Title>
            <Card.Body>
              <div className="text-center">
                <Form onSubmit={submitCreateCampaign} className="px-5">
                  <Form.Group className="mb-3 pt-3">
                    <Form.Label className="text-light">Campaign Name</Form.Label>
                    <Form.Control
                      className="mb-2"
                      onChange={(e) =>
                        updateCreateCampaignForm({
                          campaignName: e.target.value,
                        })
                      }
                      type="text"
                      value={createCampaignForm.campaignName}
                      placeholder="Enter campaign name"
                    />
                  </Form.Group>
                  <div className="text-center">
                    <Button variant="primary" type="submit">
                      Create
                    </Button>
                    <Button
                      className="ms-4"
                      variant="secondary"
                      type="button"
                      onClick={closeCreateCampaignModal}
                    >
                      Close
                    </Button>
                  </div>
                </Form>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Modal>
    </>
  );
}
