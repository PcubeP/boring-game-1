const STORAGE_KEY = 'bangalore_pothole_dodger_save_v1';

const defaultData = {
  highScore: 0,
  coins: 50,
  unlockedVehicles: ['cab'],
  selectedVehicle: 'cab',
  stats: {
    totalDistance: 0,
    potholesDodged: 0,
    wrongWayDodged: 0,
    runsPlayed: 0
  },
  settings: {
    sound: true,
    haptics: true,
    controlMode: 'buttons'
  }
};

export const Storage = {
  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultData,
          ...parsed,
          stats: { ...defaultData.stats, ...(parsed.stats || {}) },
          settings: { ...defaultData.settings, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return { ...defaultData };
  },

  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  },

  updateStats(newDistance, potholes, wrongWays, coinsEarned) {
    const data = this.load();
    data.coins = (data.coins || 0) + coinsEarned;
    if (newDistance > (data.highScore || 0)) {
      data.highScore = Math.floor(newDistance);
    }
    data.stats.totalDistance += Math.floor(newDistance);
    data.stats.potholesDodged += potholes;
    data.stats.wrongWayDodged += wrongWays;
    data.stats.runsPlayed += 1;
    this.save(data);
    return data;
  },

  unlockVehicle(id, cost) {
    const data = this.load();
    if (data.coins >= cost && !data.unlockedVehicles.includes(id)) {
      data.coins -= cost;
      data.unlockedVehicles.push(id);
      data.selectedVehicle = id;
      this.save(data);
      return true;
    }
    return false;
  },

  selectVehicle(id) {
    const data = this.load();
    if (data.unlockedVehicles.includes(id)) {
      data.selectedVehicle = id;
      this.save(data);
      return true;
    }
    return false;
  },

  toggleSetting(key) {
    const data = this.load();
    data.settings[key] = !data.settings[key];
    this.save(data);
    return data.settings[key];
  }
};
