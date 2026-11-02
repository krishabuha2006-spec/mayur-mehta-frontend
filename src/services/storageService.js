import { driveService } from './driveService';

/**
 * Storage Service - Backward compatible proxy to Module M1.9 driveService
 */
export const storageService = {
  ...driveService,

  // Legacy mappings
  getFiles: async (params = {}) => {
    try {
      const browseRes = await driveService.browse(params);
      return browseRes.files || [];
    } catch {
      return [];
    }
  },

  saveFile: async (fileData) => {
    return fileData;
  }
};

export default storageService;
