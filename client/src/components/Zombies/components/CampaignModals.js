import React, { useMemo, useState } from "react";
import { Button, Card, Form, Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import resolveMapImageSource from "../utils/mapImages";

const getCampaignName = (campaign) => campaign?.campaignName || campaign?.name || "Untitled Realm";
const getDungeonMaster = (campaign) => campaign?.dungeonMaster || campaign?.dm || campaign?.dmName || campaign?.owner || "Dungeon Master";
const getPlayerCount = (campaign) => {
  if (Array.isArray(campaign?.players)) return campaign.players.length;
  if (typeof campaign?.playerCount === "number") return campaign.playerCount;
  return 0;
};
const campaignInitials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "RT";
const getActiveMapImage = (campaign) => {
  const maps = Array.isArray(campaign?.maps) ? campaign.maps : [];
  const activeMapId = typeof campaign?.activeMapId === "string" ? campaign.activeMapId.trim() : "";
  const activeMap = activeMapId
    ? maps.find((map) => map?.mapId === activeMapId || map?.id === activeMapId || map?.name === activeMapId)
    : maps[0];
  return resolveMapImageSource(activeMap);
};

function CampaignSearch({ value, onChange, placeholder }) {
  return (
    <label className="realm-campaign-search">
      <span className="realm-campaign-search__icon" aria-hidden="true">✦</span>
      <span className="visually-hidden">Search campaigns</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="realm-campaign-empty" role="status">
      <div className="realm-campaign-empty__sigil" aria-hidden="true">✧</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && onAction && (
        <Button className="realm-campaign-button realm-campaign-button--secondary" type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function CampaignModalShell({ show, onHide, eyebrow, title, subtitle, children, footer }) {
  return (
    <Modal className="dnd-modal realm-campaign-modal" dialogClassName="realm-campaign-modal__dialog" centered show={show} onHide={onHide}>
      <Card className="dnd-background realm-campaign-panel">
        <div className="realm-campaign-panel__glow" aria-hidden="true" />
        <header className="realm-campaign-panel__header">
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </header>
        <Card.Body className="realm-campaign-panel__body">{children}</Card.Body>
        {footer && <Modal.Footer className="realm-campaign-panel__footer">{footer}</Modal.Footer>}
      </Card>
    </Modal>
  );
}

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
  const [joinSearch, setJoinSearch] = useState("");
  const [hostSearch, setHostSearch] = useState("");

  const filteredPlayerCampaigns = useMemo(() => {
    const search = joinSearch.trim().toLowerCase();
    if (!search) return playerCampaigns;
    return playerCampaigns.filter((campaign) => `${getCampaignName(campaign)} ${getDungeonMaster(campaign)}`.toLowerCase().includes(search));
  }, [joinSearch, playerCampaigns]);

  const filteredDmCampaigns = useMemo(() => {
    const search = hostSearch.trim().toLowerCase();
    if (!search) return dmCampaigns;
    return dmCampaigns.filter((campaign) => getCampaignName(campaign).toLowerCase().includes(search));
  }, [hostSearch, dmCampaigns]);

  return (
    <>
      <CampaignModalShell
        show={showJoinCampaignModal}
        onHide={closeJoinCampaignModal}
        eyebrow="Campaign Browser"
        title="Join Campaign"
        subtitle="Choose the party you want to adventure with next."
        footer={<Button className="realm-campaign-button realm-campaign-button--secondary" type="button" onClick={closeJoinCampaignModal}>Close</Button>}
      >
        <div className="realm-campaign-toolbar">
          <CampaignSearch value={joinSearch} onChange={setJoinSearch} placeholder="Search realms or dungeon masters" />
          <span>{filteredPlayerCampaigns.length} available</span>
        </div>
        {filteredPlayerCampaigns.length > 0 ? (
          <div className="realm-campaign-grid realm-campaign-grid--join">
            {filteredPlayerCampaigns.map((campaign) => {
              const name = getCampaignName(campaign);
              const activeMapImage = getActiveMapImage(campaign);
              return (
                <Link className="realm-campaign-card realm-campaign-card--join" key={name} to={`/zombies-character-select/${name}`} onClick={closeJoinCampaignModal}>
                  <div className="realm-campaign-card__art" aria-hidden="true">
                    {activeMapImage ? <img src={activeMapImage} alt="" /> : <span>{campaignInitials(name)}</span>}
                  </div>
                  <div className="realm-campaign-card__content">
                    <h3>{name}</h3>
                    <p>{campaign?.description || `Run by ${getDungeonMaster(campaign)} with ${getPlayerCount(campaign)} players at the table.`}</p>
                    <div className="realm-campaign-card__meta">
                      <span>DM {getDungeonMaster(campaign)}</span>
                      <span>{getPlayerCount(campaign)} players</span>
                    </div>
                  </div>
                  <span className="realm-campaign-button realm-campaign-button--primary">Join</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No open portals" message="No matching player campaigns are ready yet. Try another search or create a new realm from the command deck." />
        )}
      </CampaignModalShell>

      <CampaignModalShell
        show={showHostCampaignModal}
        onHide={closeHostCampaignModal}
        eyebrow="World Launcher"
        title="Host Campaign"
        subtitle="Select a realm, gather the party, and launch tonight's session."
        footer={<Button className="realm-campaign-button realm-campaign-button--secondary" type="button" onClick={closeHostCampaignModal}>Close</Button>}
      >
        <div className="realm-campaign-toolbar">
          <CampaignSearch value={hostSearch} onChange={setHostSearch} placeholder="Search hosted worlds" />
          <span>{filteredDmCampaigns.length} worlds</span>
        </div>
        {filteredDmCampaigns.length > 0 ? (
          <div className="realm-campaign-grid realm-campaign-grid--host">
            {filteredDmCampaigns.map((campaign) => {
              const name = getCampaignName(campaign);
              const activeMapImage = getActiveMapImage(campaign);
              return (
                <Link className="realm-campaign-card realm-campaign-card--host" key={name} to={`/zombies-dm/${name}`} onClick={closeHostCampaignModal}>
                  <div className="realm-campaign-card__art" aria-hidden="true">
                    {activeMapImage ? <img src={activeMapImage} alt="" /> : <span>{campaignInitials(name)}</span>}
                  </div>
                  <div className="realm-campaign-card__content">
                    <h3>{name}</h3>
                    <div className="realm-campaign-card__meta realm-campaign-card__meta--launcher">
                      <span>DM badge</span><span>{getPlayerCount(campaign)} players</span>
                    </div>
                  </div>
                  <span className="realm-campaign-button realm-campaign-button--primary">Host</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No worlds found" message="Your hosted campaign list is empty. Create a new realm to prepare your next adventure." onAction={closeHostCampaignModal} actionLabel="Back to command deck" />
        )}
      </CampaignModalShell>

      <CampaignModalShell
        show={showCreateCampaignModal}
        onHide={closeCreateCampaignModal}
        eyebrow="New Realm Setup"
        title="Create Campaign"
        subtitle="Name the world now. Player invites and launch options can grow here next."
      >
        <Form onSubmit={submitCreateCampaign} className="realm-create-campaign-form">
          <div className="realm-create-campaign-form__fields">
            <label className="realm-floating-field">
              <input onChange={(e) => updateCreateCampaignForm({ campaignName: e.target.value })} type="text" value={createCampaignForm.campaignName} placeholder=" " />
              <span>Campaign name</span>
            </label>
            <p>Give your realm a memorable title. You can add maps, characters, and encounters after creation.</p>
            <div className="realm-create-campaign-form__actions">
              <Button className="realm-campaign-button realm-campaign-button--primary" type="submit">Create Campaign</Button>
              <Button className="realm-campaign-button realm-campaign-button--secondary" type="button" onClick={closeCreateCampaignModal}>Close</Button>
            </div>
          </div>
        </Form>
      </CampaignModalShell>
    </>
  );
}
