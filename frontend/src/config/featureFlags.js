// src/config/featureFlags.js
export const FLAGS = {
  // Parent > Learning > Resources (Phase 1: hidden)
  parentResources: false,

  // Feedback > Tasks (hidden in this version)
  tasks: false,
};

export const isEnabled = (flag) => !!FLAGS[flag];
