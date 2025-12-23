/**
 * Game configuration
 * Set different values for development vs production
 */

// Check if we're in production (deployed) or development (local)
const isProduction = import.meta.env.PROD;

export const CONFIG = {
  // Number of lines needed to advance to the next level
  LINES_PER_LEVEL: isProduction ? 15 : 2,
};

