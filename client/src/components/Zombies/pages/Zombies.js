import React from "react";
import { Button, Alert } from "react-bootstrap";
import loginbg from "../../../images/loginbg.png";
import apiFetch from "../../../utils/apiFetch";
import CampaignModals from "../components/CampaignModals";
import useCampaignActions from "../hooks/useCampaignActions";

export default function Zombies() {
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

  const handleLogout = async () => {
    await apiFetch("/logout", { method: "POST" });
    window.location.assign("/");
  };

  return (
    <div
      className="pt-2 text-center"
      style={{
        fontFamily: "Raleway, sans-serif",
        backgroundImage: `url(${loginbg})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        height: "100vh",
      }}
    >
      {campaignNotification && (
        <Alert variant="danger" dismissible onClose={clearNotification}>
          {campaignNotification}
        </Alert>
      )}

      <div className="d-flex flex-column justify-content-center align-items-center h-100">
        <Button
          className="mb-3 fantasy-button campaign-button"
          style={{ borderColor: "transparent" }}
          onClick={openJoinCampaignModal}
        >
          Join Campaign
        </Button>
        <Button
          className="mb-3 hostCampaign campaign-button"
          style={{ borderColor: "transparent" }}
          onClick={openHostCampaignModal}
        >
          Host Campaign
        </Button>
        <Button
          className="create-button campaign-button"
          style={{ borderColor: "transparent" }}
          onClick={openCreateCampaignModal}
        >
          Create Campaign
        </Button>
        <Button
          className="mt-3 fantasy-button campaign-button"
          style={{ borderColor: "transparent" }}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>

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
    </div>
  );
}
