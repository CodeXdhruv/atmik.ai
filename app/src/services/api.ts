import auth from '@react-native-firebase/auth';

const API_BASE_URL = 'https://atmik-ai-backend.swatantra-backend.workers.dev';

const getAuthHeaders = async () => {
  let token = 'temp-user-token';
  try {
    const currentUser = auth().currentUser;
    if (currentUser) {
      token = await currentUser.getIdToken(false);
    }
  } catch (err) {
    console.warn("Could not get Firebase token, using fallback token:", err);
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const apiService = {
  /**
   * Fetch all content from the library
   */
  async fetchLibraryContent() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library/content`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        console.error("Failed to fetch library content:", response.status);
        return [];
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching library content:", error);
      return [];
    }
  },

  fetchCategories: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library/categories`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        console.error("Failed to fetch library categories:", response.status);
        return [];
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching library categories:", error);
      return [];
    }
  },

  fetchQuotesPool: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library/quotes`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        console.error("Failed to fetch quotes pool:", response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error("Error fetching quotes pool:", error);
      return [];
    }
  },

  /**
   * Fetch today's dynamic journey bundle for Inner Journey (Practice screen)
   */
  async fetchTodaysJourney() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/journey/today`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        console.warn("Could not fetch today's journey bundle, fallback to local:", response.status);
        return null;
      }
      const resData = await response.json();
      return resData.success ? resData.data : null;
    } catch (error) {
      console.warn("Error fetching today's journey bundle:", error);
      return null;
    }
  },
};
