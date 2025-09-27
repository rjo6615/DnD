import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiFetch from "../../../utils/apiFetch";
import useUser from "../../../hooks/useUser";

export default function useCampaignActions() {
  const navigate = useNavigate();
  const user = useUser();

  const [playerCampaigns, setPlayerCampaigns] = useState([]);
  const [dmCampaigns, setDmCampaigns] = useState([]);
  const [notification, setNotification] = useState("");

  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false);
  const [showHostCampaignModal, setShowHostCampaignModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);

  const [createCampaignForm, setCreateCampaignForm] = useState({
    campaignName: "",
    gameMode: "zombies",
    dm: "",
    players: [],
  });

  const username = user?.username ?? "";

  useEffect(() => {
    if (username) {
      setCreateCampaignForm((prev) => ({ ...prev, dm: username }));
    }
  }, [username]);

  const clearNotification = useCallback(() => setNotification(""), []);

  const fetchPlayerCampaigns = useCallback(async () => {
    if (!username) {
      return [];
    }

    try {
      const response = await apiFetch(`/campaigns/player/${username}`);

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setNotification(message);
        return [];
      }

      const record = await response.json();
      if (!record) {
        setNotification("Record not found");
        navigate("/");
        return [];
      }

      setPlayerCampaigns(record);
      return record;
    } catch (error) {
      setNotification(error.message || "An unexpected error has occurred");
      return [];
    }
  }, [navigate, username]);

  const fetchDmCampaigns = useCallback(async () => {
    if (!username) {
      return [];
    }

    try {
      const response = await apiFetch(`/campaigns/dm/${username}`);

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setNotification(message);
        return [];
      }

      const record = await response.json();
      if (!record) {
        setNotification("Record not found");
        navigate("/");
        return [];
      }

      setDmCampaigns(record);
      return record;
    } catch (error) {
      setNotification(error.message || "An unexpected error has occurred");
      return [];
    }
  }, [navigate, username]);

  useEffect(() => {
    fetchPlayerCampaigns();
  }, [fetchPlayerCampaigns]);

  const updateCreateCampaignForm = useCallback((value) => {
    setCreateCampaignForm((prev) => ({ ...prev, ...value }));
  }, []);

  const submitCreateCampaign = useCallback(
    async (event) => {
      event?.preventDefault?.();

      if (!username) {
        setNotification("You must be logged in to create a campaign.");
        return false;
      }

      const newCampaign = {
        ...createCampaignForm,
        dm: createCampaignForm.dm || username,
      };

      try {
        const response = await apiFetch("/campaigns/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newCampaign),
        });

        if (!response.ok) {
          const message = `An error has occurred: ${response.statusText}`;
          setNotification(message);
          return false;
        }

        updateCreateCampaignForm({ campaignName: "" });
        await Promise.all([fetchDmCampaigns(), fetchPlayerCampaigns()]);
        setShowCreateCampaignModal(false);
        return true;
      } catch (error) {
        setNotification(error.message || "An unexpected error has occurred");
        return false;
      }
    },
    [createCampaignForm, fetchDmCampaigns, fetchPlayerCampaigns, updateCreateCampaignForm, username]
  );

  const openJoinCampaignModal = useCallback(async () => {
    await fetchPlayerCampaigns();
    setShowJoinCampaignModal(true);
  }, [fetchPlayerCampaigns]);

  const closeJoinCampaignModal = useCallback(() => {
    setShowJoinCampaignModal(false);
  }, []);

  const openHostCampaignModal = useCallback(async () => {
    await fetchDmCampaigns();
    setShowHostCampaignModal(true);
  }, [fetchDmCampaigns]);

  const closeHostCampaignModal = useCallback(() => {
    setShowHostCampaignModal(false);
  }, []);

  const openCreateCampaignModal = useCallback(() => {
    setShowCreateCampaignModal(true);
  }, []);

  const closeCreateCampaignModal = useCallback(() => {
    setShowCreateCampaignModal(false);
  }, []);

  return useMemo(
    () => ({
      notification,
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
    }),
    [
      clearNotification,
      closeCreateCampaignModal,
      closeHostCampaignModal,
      closeJoinCampaignModal,
      createCampaignForm,
      dmCampaigns,
      notification,
      openCreateCampaignModal,
      openHostCampaignModal,
      openJoinCampaignModal,
      playerCampaigns,
      showCreateCampaignModal,
      showHostCampaignModal,
      showJoinCampaignModal,
      submitCreateCampaign,
      updateCreateCampaignForm,
    ]
  );
}
