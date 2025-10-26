export const getMonkLevel = (form) => {
  if (!form || typeof form !== 'object' || !Array.isArray(form.occupation)) {
    return 0;
  }

  return form.occupation.reduce((total, occupationEntry) => {
    if (!occupationEntry || typeof occupationEntry !== 'object') {
      return total;
    }

    const name = String(
      occupationEntry.Name ??
        occupationEntry.Occupation ??
        occupationEntry.name ??
        occupationEntry.occupation ??
        ''
    ).toLowerCase();

    if (name !== 'monk') {
      return total;
    }

    const levelValue = Number(
      occupationEntry.Level ??
        occupationEntry.level ??
        occupationEntry.Levels ??
        occupationEntry.levels ??
        0
    );

    if (!Number.isFinite(levelValue) || levelValue <= 0) {
      return total;
    }

    return total + levelValue;
  }, 0);
};

export const getMonkFocusPoints = (form) => {
  const monkLevel = getMonkLevel(form);
  if (monkLevel < 2) {
    return 0;
  }

  return monkLevel;
};
