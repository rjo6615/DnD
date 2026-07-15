import React, { useMemo } from "react";
import { Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import apiFetch from "../../../utils/apiFetch";
import CampaignModals from "../components/CampaignModals";
import useCampaignActions from "../hooks/useCampaignActions";
import logoLight from "../../../images/logo-light.png";

const getCampaignTitle = (campaign) => campaign?.campaignName || "Untitled Realm";

function HomeActionCard({ icon, title, description, meta, onClick, featured = false }) {
  return (
    <button
      type="button"
      className={`realm-home-action-card ${featured ? "realm-home-action-card--featured" : ""}`}
      onClick={onClick}
    >
      <span className="realm-home-action-card__glow" aria-hidden="true" />
      <span className="realm-home-action-card__icon" aria-hidden="true"><i className={icon} /></span>
      <span className="realm-home-action-card__content">
        <span className="realm-home-action-card__title">{title}</span>
        <span className="realm-home-action-card__description">{description}</span>
        {meta && <span className="realm-home-action-card__meta">{meta}</span>}
      </span>
    </button>
  );
}

function RecentCampaignCard({ campaign, role, onResume }) {
  return (
    <article className="realm-recent-campaign-card">
      <div className="realm-recent-campaign-card__art" aria-hidden="true">
        <i className="fa-solid fa-dice-d20" />
      </div>
      <div className="realm-recent-campaign-card__body">
        <span className="realm-recent-campaign-card__eyebrow">{role === "dm" ? "Dungeon Master" : "Adventurer"}</span>
        <h3>{getCampaignTitle(campaign)}</h3>
        <p>DM {campaign?.dm || "Unknown"} · Last opened recently</p>
      </div>
      <button type="button" className="realm-recent-campaign-card__resume" onClick={onResume}>
        Resume
      </button>
    </article>
  );
}

function ProfileSummary({ username, campaignCount, characterCount, onLogout }) {
  return (
    <aside className="realm-profile-summary" aria-label="Account summary">
      <div className="realm-profile-summary__avatar"><i className="fa-solid fa-user-astronaut" /></div>
      <div>
        <span className="realm-profile-summary__label">Signed in as</span>
        <strong>{username || "Adventurer"}</strong>
      </div>
      <div className="realm-profile-summary__stats">
        <span><i className="fa-solid fa-crown" /> {campaignCount} Campaigns</span>
        <span><i className="fa-solid fa-shield-halved" /> {characterCount} Characters</span>
      </div>
      <button type="button" className="realm-profile-summary__logout" onClick={onLogout}>
        <i className="fa-solid fa-door-open" aria-hidden="true" />
        <span>Logout</span>
      </button>
    </aside>
  );
}

function HeroSection({ username }) {
  return (
    <header className="realm-home-hero">
      <div className="realm-home-hero__sigil" aria-hidden="true"><img src={logoLight} alt="" /></div>
      <p className="realm-home-hero__welcome">Welcome back{username ? `, ${username}` : ""}</p>
      <h1>RealmTracker</h1>
      <p className="realm-home-hero__subtitle">Virtual Tabletop for Dungeons & Dragons</p>
    </header>
  );
}

export default function Zombies() {
  const navigate = useNavigate();
  const {
    notification: campaignNotification,
    clearNotification,
    playerCampaigns,
    dmCampaigns,
    showJoinCampaignModal,
    showHostCampaignModal,
    showCreateCampaignModal,
    openJoinCampaignModal,
    closeJoinCampaignModal,
    openHostCampaignModal,
    closeHostCampaignModal,
    openCreateCampaignModal,
    closeCreateCampaignModal,
    createCampaignForm,
    updateCreateCampaignForm,
    submitCreateCampaign,
  } = useCampaignActions();

  const username = createCampaignForm.dm;
  const recentCampaigns = useMemo(() => {
    const hosted = dmCampaigns.map((campaign) => ({ campaign, role: "dm" }));
    const joined = playerCampaigns.map((campaign) => ({ campaign, role: "player" }));
    return [...hosted, ...joined].slice(0, 3);
  }, [dmCampaigns, playerCampaigns]);

  const campaignCount = dmCampaigns.length + playerCampaigns.length;
  const characterCount = playerCampaigns.length;

  const resumeCampaign = (campaign, role) => {
    const encodedCampaign = encodeURIComponent(getCampaignTitle(campaign));
    navigate(role === "dm" ? `/zombies-dm/${encodedCampaign}` : `/zombies-character-select/${encodedCampaign}`);
  };

  const handleLogout = async () => {
    await apiFetch("/logout", { method: "POST" });
    window.location.assign("/");
  };

  return (
    <main className="realm-home-shell">
      <div className="realm-home-backdrop" aria-hidden="true">
        <span className="realm-home-backdrop__orb realm-home-backdrop__orb--one" />
        <span className="realm-home-backdrop__orb realm-home-backdrop__orb--two" />
        <span className="realm-home-backdrop__rune" />
        <span className="realm-home-backdrop__mist" />
      </div>

      {campaignNotification && (
        <Alert className="realm-home-alert" variant="danger" dismissible onClose={clearNotification}>
          {campaignNotification}
        </Alert>
      )}

      <section className="realm-home-layout" aria-label="RealmTracker home">
        <HeroSection username={username} />

        <section className="realm-home-command hud-panel" aria-label="Campaign actions">
          <div className="realm-home-command__intro">
            <span>Choose your next move</span>
            <strong>Adventure Gate</strong>
          </div>
          <div className="realm-home-actions">
            <HomeActionCard icon="fa-solid fa-compass" title="Join Campaign" description="Connect to an existing adventure." meta={`${playerCampaigns.length} joined realms`} onClick={openJoinCampaignModal} featured />
            <HomeActionCard icon="fa-solid fa-crown" title="Host Campaign" description="Launch your active campaign." meta={`${dmCampaigns.length} hosted realms`} onClick={openHostCampaignModal} />
            <HomeActionCard icon="fa-solid fa-wand-sparkles" title="Create Campaign" description="Start building a new world." meta="Forge a new table" onClick={openCreateCampaignModal} />
          </div>
        </section>

        <section className="realm-home-lower">
          <div className="realm-home-recent hud-card">
            <div className="realm-home-section-heading">
              <span>Fast travel</span>
              <h2>Recent Campaigns</h2>
            </div>
            {recentCampaigns.length > 0 ? (
              <div className="realm-home-recent__list">
                {recentCampaigns.map(({ campaign, role }) => (
                  <RecentCampaignCard
                    key={`${role}-${getCampaignTitle(campaign)}`}
                    campaign={campaign}
                    role={role}
                    onResume={() => resumeCampaign(campaign, role)}
                  />
                ))}
              </div>
            ) : (
              <div className="realm-home-empty-state">
                <i className="fa-solid fa-scroll" />
                <p>No recent campaigns yet. Create a realm or join an existing table to begin.</p>
              </div>
            )}
          </div>

          <div className="realm-home-sidecar">
            <ProfileSummary
              username={username}
              campaignCount={campaignCount}
              characterCount={characterCount}
              onLogout={handleLogout}
            />
          </div>
        </section>
      </section>

      <CampaignModals
        playerCampaigns={playerCampaigns}
        dmCampaigns={dmCampaigns}
        showJoinCampaignModal={showJoinCampaignModal}
        closeJoinCampaignModal={closeJoinCampaignModal}
        showHostCampaignModal={showHostCampaignModal}
        closeHostCampaignModal={closeHostCampaignModal}
        showCreateCampaignModal={showCreateCampaignModal}
        closeCreateCampaignModal={closeCreateCampaignModal}
        createCampaignForm={createCampaignForm}
        updateCreateCampaignForm={updateCreateCampaignForm}
        submitCreateCampaign={submitCreateCampaign}
      />
    </main>
  );
}
