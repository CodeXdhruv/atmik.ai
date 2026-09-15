import auth from '@react-native-firebase/auth';

const API_BASE_URL = 'https://atmik-ai-backend.swatantra-backend.workers.dev';

const getAuthHeaders = async () => {
  let token = 'temp-user-token';
  const currentUser = auth().currentUser;
  if (currentUser) {
    token = await currentUser.getIdToken(false);
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
      // The backend returns c.json(result.results), which is an array, or {data: []} depending on the standard
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error("Error fetching quotes pool:", error);
      return [];
    }
  },

};
