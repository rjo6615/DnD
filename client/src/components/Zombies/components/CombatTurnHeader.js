import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const HEX_COLOR_REGEX = /^[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?$/;
export const HEADER_PADDING = 16;

const parseHexColor = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!HEX_COLOR_REGEX.test(normalized)) {
    return null;
  }

  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }

  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }

  if (normalized.length === 8) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }

  return null;
};

const lightenComponent = (component) =>
  Math.min(255, Math.round(component + (255 - component) * 0.32));

const getTokenColorStyles = (colorValue) => {
  const parsed = parseHexColor(colorValue);

  if (!parsed) {
    return {
      background: 'linear-gradient(140deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08))',
      borderColor: 'rgba(255, 255, 255, 0.28)',
      textColor: '#fdf8ef',
    };
  }

  const { r, g, b } = parsed;
  const lr = lightenComponent(r);
  const lg = lightenComponent(g);
  const lb = lightenComponent(b);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return {
    background: `linear-gradient(140deg, rgba(${lr}, ${lg}, ${lb}, 0.9), rgba(${r}, ${g}, ${b}, 0.95))`,
    borderColor: `rgba(${lr}, ${lg}, ${lb}, 0.9)`,
    textColor: brightness > 155 ? '#1c140b' : '#fdf8ef',
  };
};

export function CombatTurnHeader({ participants, tokenLookup = {} }) {
  const headerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const lastAutoScrollTargetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const participantsCount = Array.isArray(participants) ? participants.length : 0;
  const activeIndex = useMemo(() => {
    if (!Array.isArray(participants)) {
      return -1;
    }

    return participants.findIndex((participant) => participant?.isActive);
  }, [participants]);
  const activeParticipant = useMemo(() => {
    if (activeIndex < 0 || !Array.isArray(participants)) {
      return null;
    }

    return participants[activeIndex] ?? null;
  }, [activeIndex, participants]);

  const updateOverflowHints = useCallback(() => {
    const container = headerRef.current;

    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollWidth, clientWidth } = container;
    const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
    let { scrollLeft } = container;

    if (scrollLeft < 1 && scrollLeft !== 0) {
      container.scrollLeft = 0;
      scrollLeft = 0;
    } else if (maxScrollLeft - scrollLeft < 1 && scrollLeft !== maxScrollLeft) {
      container.scrollLeft = maxScrollLeft;
      scrollLeft = maxScrollLeft;
    }

    const nextCanScrollLeft = scrollLeft > 0;
    const nextCanScrollRight = maxScrollLeft - scrollLeft > 0;

    setCanScrollLeft((prev) => (prev !== nextCanScrollLeft ? nextCanScrollLeft : prev));
    setCanScrollRight((prev) => (prev !== nextCanScrollRight ? nextCanScrollRight : prev));
  }, []);

  useEffect(() => {
    updateOverflowHints();

    const handleResize = () => {
      updateOverflowHints();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateOverflowHints, participantsCount]);

  const isScrollable = canScrollLeft || canScrollRight;

  const headerClassName = useMemo(() => {
    const classes = ['combat-turn-header'];

    if (isDragging) {
      classes.push('combat-turn-header--dragging');
    }
    if (isScrollable) {
      classes.push('combat-turn-header--scrollable');
    }
    if (canScrollLeft) {
      classes.push('combat-turn-header--fade-left');
    }
    if (canScrollRight) {
      classes.push('combat-turn-header--fade-right');
    }
    if (!participantsCount) {
      classes.push('combat-turn-header--empty');
    }

    return classes.join(' ');
  }, [isDragging, isScrollable, canScrollLeft, canScrollRight, participantsCount]);

  const finishDrag = useCallback(
    (event) => {
      if (!isDraggingRef.current) {
        const container = headerRef.current;
        if (container && typeof event?.pointerId === 'number' && container.hasPointerCapture?.(event.pointerId)) {
          container.releasePointerCapture(event.pointerId);
        }
        return;
      }

      isDraggingRef.current = false;
      setIsDragging(false);

      const container = headerRef.current;
      if (container && typeof event?.pointerId === 'number' && container.hasPointerCapture?.(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }

      updateOverflowHints();
    },
    [updateOverflowHints],
  );

  const handlePointerDown = useCallback((event) => {
    const container = headerRef.current;
    if (!container) {
      return;
    }

    isDraggingRef.current = true;
    startXRef.current = event.clientX ?? 0;
    startScrollLeftRef.current = container.scrollLeft;
    setIsDragging(true);

    if (typeof event.pointerId === 'number' && container.setPointerCapture) {
      try {
        container.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore capture errors (e.g., unsupported browsers).
      }
    }
  }, []);

  const handlePointerMove = useCallback(
    (event) => {
      if (!isDraggingRef.current) {
        return;
      }

      const container = headerRef.current;
      if (!container) {
        return;
      }

      event.preventDefault();

      const pointerX = event.clientX ?? 0;
      const deltaX = pointerX - startXRef.current;
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, startScrollLeftRef.current - deltaX));

      container.scrollLeft = nextScrollLeft;

      updateOverflowHints();
    },
    [updateOverflowHints],
  );

  const handlePointerUp = useCallback(
    (event) => {
      finishDrag(event);
    },
    [finishDrag],
  );

  const handlePointerLeave = useCallback(
    (event) => {
      finishDrag(event);
    },
    [finishDrag],
  );

  const handlePointerCancel = useCallback(
    (event) => {
      finishDrag(event);
    },
    [finishDrag],
  );

  const handleScroll = useCallback(() => {
    updateOverflowHints();
  }, [updateOverflowHints]);

  useEffect(() => {
    if (isDragging) {
      return;
    }

    const container = headerRef.current;
    const participantsList = Array.isArray(participants) ? participants : null;
    const activeParticipantCandidate = activeIndex >= 0 && participantsList ? participantsList[activeIndex] : null;

    if (activeIndex < 0 || !activeParticipantCandidate) {
      if (lastAutoScrollTargetRef.current !== null) {
        lastAutoScrollTargetRef.current = null;
      }
      return;
    }

    if (!container) {
      return;
    }

    const identifier = activeParticipantCandidate.characterId ?? activeIndex;

    if (lastAutoScrollTargetRef.current === identifier) {
      return;
    }

    const card = container.querySelector(
      `.combat-turn-header__card[data-participant-index="${activeIndex}"]`,
    );
    if (!card) {
      return;
    }

    const adjustScrollManually = () => {
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      const leftOverflow = cardRect.left - containerRect.left - HEADER_PADDING;
      const rightOverflow = cardRect.right - containerRect.right + HEADER_PADDING;

      if (leftOverflow < 0) {
        container.scrollLeft += leftOverflow;
      } else if (rightOverflow > 0) {
        container.scrollLeft += rightOverflow;
      }
    };

    if (typeof card.scrollIntoView === 'function') {
      try {
        card.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      } catch (error) {
        // Ignore scrollIntoView errors and fall back to manual scrolling.
      }
    }

    const schedule =
      typeof requestAnimationFrame === 'function'
        ? (callback) => requestAnimationFrame(callback)
        : (callback) => callback();

    schedule(() => {
      adjustScrollManually();
      updateOverflowHints();
    });

    lastAutoScrollTargetRef.current = identifier;
  }, [activeIndex, participants, isDragging, updateOverflowHints]);

  return (
    <>
      <div
        className={
          activeParticipant
            ? 'combat-turn-header__active-indicator'
            : 'combat-turn-header__active-indicator combat-turn-header__active-indicator--inactive'
        }
        role="status"
        aria-live="polite"
      >
        <span className="combat-turn-header__active-label">Current Turn:</span>
        <span className="combat-turn-header__active-name">
          {activeParticipant ? activeParticipant.name : 'No active combatant'}
        </span>
      </div>
      <div
        ref={headerRef}
        className={headerClassName}
        role="group"
        aria-label="Combat turn order"
        style={{ touchAction: participantsCount ? 'pan-x' : 'auto' }}
        onPointerDown={participantsCount ? handlePointerDown : undefined}
        onPointerMove={participantsCount ? handlePointerMove : undefined}
        onPointerUp={participantsCount ? handlePointerUp : undefined}
        onPointerLeave={participantsCount ? handlePointerLeave : undefined}
        onPointerCancel={participantsCount ? handlePointerCancel : undefined}
        onScroll={participantsCount ? handleScroll : undefined}
      >
        <div className="combat-turn-header__track">
          {participantsCount ? (
            participants.map((participant, index) => {
              const { characterId, name, hpDisplay, hpCurrent, hpMax, isActive } = participant;
              const trimmedId =
                typeof characterId === 'string' && characterId.trim() !== ''
                  ? characterId.trim()
                  : null;
              const tokenMeta = trimmedId ? tokenLookup[trimmedId] : null;
              const tokenLabel =
                (typeof tokenMeta?.label === 'string' && tokenMeta.label.trim() !== ''
                  ? tokenMeta.label.trim()
                  : null) ||
                (typeof name === 'string' && name.trim() !== '' ? name.trim() : null);
              const figurineInitial = tokenLabel ? tokenLabel.charAt(0).toUpperCase() : '?';
              const { background, borderColor, textColor } = getTokenColorStyles(tokenMeta?.color);
              const figurineImageUrl =
                typeof tokenMeta?.figurineImageUrl === 'string' && tokenMeta.figurineImageUrl.trim() !== ''
                  ? tokenMeta.figurineImageUrl.trim()
                  : null;
              const figurineClassName = [
                'combat-turn-header__figurine',
                figurineImageUrl ? 'combat-turn-header__figurine--has-image' : null,
                isActive ? 'combat-turn-header__figurine--active' : null,
              ]
                .filter(Boolean)
                .join(' ');

              const hasHpData = hpCurrent !== null || hpMax !== null;
              const computedPercentage =
                hpCurrent !== null && hpMax !== null && hpMax > 0
                  ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100))
                  : null;
              const hpPercentage = computedPercentage !== null ? computedPercentage : 0;
              const hpColorHue = computedPercentage !== null ? (hpPercentage / 100) * 120 : 0;
              const hpFillColor =
                computedPercentage !== null
                  ? `hsl(${Math.round(hpColorHue)}, 70%, 45%)`
                  : 'rgba(220, 220, 220, 0.35)';

              return (
                <div
                  key={characterId ?? `combat-participant-${index}`}
                  className="combat-turn-header__card"
                  data-participant-id={characterId}
                  data-participant-index={index}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(37, 31, 26, 0.96), rgba(18, 15, 12, 0.94))'
                      : 'rgba(28, 25, 22, 0.82)',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    boxShadow: isActive
                      ? '0 0 14px rgba(214, 178, 86, 0.65), 0 0 6px rgba(214, 178, 86, 0.35) inset'
                      : '0 0 6px rgba(0, 0, 0, 0.4)',
                    border: isActive
                      ? '1px solid rgba(214, 178, 86, 0.8)'
                      : '1px solid rgba(255, 255, 255, 0.16)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    transform: isActive ? 'scale(1.015)' : 'scale(1)',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '12px',
                      letterSpacing: '0.4px',
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        opacity: 0.9,
                        marginBottom: '3px',
                      }}
                    >
                      <span>HP</span>
                      <span>{hasHpData ? hpDisplay : '—'}</span>
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '6px',
                        borderRadius: '4px',
                        background: 'rgba(0, 0, 0, 0.45)',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${hpPercentage}%`,
                          background: computedPercentage !== null
                            ? `linear-gradient(90deg, ${hpFillColor} 0%, ${hpFillColor} 100%)`
                            : 'transparent',
                          transition: 'width 0.3s ease, background-color 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                  <div className="combat-turn-header__figurine-area">
                    <div
                      className={figurineClassName}
                      style={
                        figurineImageUrl
                          ? {
                              borderColor,
                            }
                          : {
                              background,
                              borderColor,
                              color: textColor,
                            }
                      }
                      aria-hidden="true"
                      title={tokenLabel || undefined}
                    >
                      {figurineImageUrl ? (
                        <img
                          src={figurineImageUrl}
                          alt=""
                          className="combat-turn-header__figurine-image"
                          draggable={false}
                        />
                      ) : (
                        <span className="combat-turn-header__figurine-initial">{figurineInitial}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="combat-turn-header__placeholder" aria-hidden="true" />
          )}
        </div>
      </div>
    </>
  );
}

export default CombatTurnHeader;
