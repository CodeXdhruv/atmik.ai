import { create } from 'zustand';
import { 
  ContentItem, 
  Category, 
  Tag, 
  User, 
  MediaItem, 
  Comment, 
  ActivityLog
} from '../services/mockData';
import { apiService } from '../services/api';

interface AdminState {
  // Authentication
  isAuthenticated: boolean;
  currentAdmin: User | null;
  login: (user: Partial<User>) => void;
  logout: () => void;

  // Data Collections
  contentList: ContentItem[];
  fetchContent: () => Promise<void>;
  categories: Category[];
  fetchCategories: () => Promise<void>;
  tags: Tag[];
  users: User[];
  fetchUsers: () => Promise<void>;
  mediaLibrary: MediaItem[];
  comments: Comment[];
  activityLogs: ActivityLog[];

  // Content Actions
  addContentItem: (item: Omit<ContentItem, 'id' | 'views' | 'bookmarks' | 'downloads' | 'date'>) => void;
  updateContentItem: (id: string, updates: Partial<ContentItem>) => void;
  deleteContentItem: (id: string) => void;

  // Categories Actions
  addCategory: (name: string, parentId: string | null, icon?: string) => Promise<void>;
  renameCategory: (id: string, name: string, icon?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Tags Actions
  addTag: (name: string, color: string) => void;
  deleteTag: (id: string) => void;
  mergeTags: (sourceId: string, targetId: string) => void;

  // Media Actions
  uploadMediaItem: (file: { name: string; type: string; size: string; url: string; folder?: string }) => void;
  deleteMediaItem: (id: string) => void;
  renameMediaItem: (id: string, newName: string) => void;

  // Comment Actions
  approveComment: (id: string) => void;
  rejectComment: (id: string) => void;
  deleteComment: (id: string) => void;

  // User Actions
  toggleUserStatus: (id: string) => void;
  updateUserRole: (id: string, role: User['role']) => Promise<void>;

  // UI States
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  notificationCenterOpen: boolean;
  setNotificationCenterOpen: (open: boolean) => void;

  // Search & Filter State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  langFilter: string;
  setLangFilter: (lang: string) => void;
  
  // Notification logs
  notifications: { id: string; title: string; desc: string; time: string; read: boolean }[];
  markAllNotificationsRead: () => void;
  addLog: (actionName: string, details: string) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // Authentication
  isAuthenticated: false,
  currentAdmin: null,
  login: (user: Partial<User>) => {
    const admin = {
      id: user.id || 'temp',
      name: user.name || user.email?.split('@')[0] || 'Admin',
      email: user.email || '',
      role: user.role || 'ADMIN',
      token: user.token,
      avatar: user.avatar || '',
    } as User;
    set({ isAuthenticated: true, currentAdmin: admin });
    
    // Add auth log
    get().addLog(`Admin Logged In`, `Admin ${admin.name} logged into the dashboard successfully.`);
    return true;
  },
  logout: () => {
    const admin = get().currentAdmin;
    if (admin) {
      get().addLog(`Admin Logged Out`, `Admin ${admin.name} logged out.`);
    }
    set({ isAuthenticated: false, currentAdmin: null });
  },

  // Data Collections
  contentList: [],
  fetchContent: async () => {
    try {
      const data = await apiService.fetchContent();
      // Map API data to ContentItem format if necessary
      const mapped = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        subtitle: item.description || '', // mapped from description if subtitle is not available
        slug: item.id, // Or generate slug
        type: item.type,
        author: item.author || 'Dr. Atmik Jain',
        status: (item.isPublished ? 'Published' : 'Draft') as 'Published' | 'Draft',
        views: item.views || 0,
        bookmarks: 0,
        downloads: 0,
        language: 'English',
        category: 'Uncategorized',
        tags: [],
        featured: false,
        date: new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        thumbnail: item.coverUrl || '',
        fileUrl: item.fileUrl,
        description: item.description || '',
      }));
      set({ contentList: mapped });
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
  },
  categories: [],
  tags: [],
  users: [],
  fetchUsers: async () => {
    try {
      const usersData = await apiService.fetchUsers();
      const mappedUsers = usersData.map((u: any) => ({
        id: u.id,
        name: u.email.split('@')[0], // Fallback name
        email: u.email,
        role: u.role,
        status: 'Active' as 'Active',
        avatar: `https://ui-avatars.com/api/?name=${u.email.split('@')[0]}&background=random`,
        lastLogin: 'Recently',
        permissions: u.role === 'ADMIN' ? ['ALL_ACCESS'] : ['READ_ONLY']
      }));
      set({ users: mappedUsers });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  },
  mediaLibrary: [],
  comments: [],
  activityLogs: [],

  // Helper log adding
  addLog: (actionName: ActivityLog['action'] | string, details: string) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(),
      adminName: get().currentAdmin?.name || 'System',
      adminAvatar: get().currentAdmin?.avatar || '',
      action: (['Publish', 'Delete', 'Upload', 'Update', 'Auth'].includes(actionName) ? actionName : 'Update') as ActivityLog['action'],
      details,
      timestamp: 'Just now'
    };
    set(state => ({
      activityLogs: [newLog, ...state.activityLogs],
      notifications: [
        {
          id: Math.random().toString(),
          title: String(actionName),
          desc: details,
          time: 'Just now',
          read: false
        },
        ...state.notifications
      ]
    }));
  },

  // Content Actions
  addContentItem: (item) => {
    const newItem: ContentItem = {
      ...item,
      id: Math.random().toString(),
      views: 0,
      bookmarks: 0,
      downloads: 0,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    set(state => ({
      contentList: [newItem, ...state.contentList]
    }));
    get().addLog('Publish', `Created new ${item.type} "${item.title}"`);
  },
  updateContentItem: (id, updates) => {
    set(state => ({
      contentList: state.contentList.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }));
    const item = get().contentList.find(i => i.id === id);
    get().addLog('Update', `Updated ${item?.type || 'content'} "${item?.title || 'item'}"`);
  },
  deleteContentItem: (id) => {
    const item = get().contentList.find(i => i.id === id);
    set(state => ({
      contentList: state.contentList.filter(item => item.id !== id)
    }));
    get().addLog('Delete', `Deleted ${item?.type || 'content'} "${item?.title || 'item'}"`);
  },

  // Categories Actions
  fetchCategories: async () => {
    try {
      const data = await apiService.fetchCategories();
      const buildTree = (items: any[], parentId: string | null = null): Category[] => {
        return items
          .filter((item) => item.parentId === parentId)
          .map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.id || item.name.toLowerCase().replace(/\s+/g, '-'),
            parentId: item.parentId || null,
            icon: item.icon,
            children: buildTree(items, item.id)
          }));
      };
      const tree = buildTree(data, null);
      set({ categories: tree });
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  },

  addCategory: async (name, parentId, icon) => {
    try {
      await apiService.addCategory(name, parentId, icon);
      get().addLog('Update', `Added new category "${name}"`);
      await get().fetchCategories();
    } catch (error) {
      console.error("Failed to add category:", error);
      throw error;
    }
  },

  renameCategory: async (id, name, icon) => {
    try {
      await apiService.updateCategory(id, name, icon);
      get().addLog('Update', `Renamed category to "${name}"`);
      await get().fetchCategories();
    } catch (error) {
      console.error("Failed to rename category:", error);
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      await apiService.deleteCategory(id);
      get().addLog('Delete', `Deleted category`);
      await get().fetchCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      throw error;
    }
  },

  // Tags Actions
  addTag: (name, color) => {
    const newTag: Tag = {
      id: `t-${Math.random().toString()}`,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      color,
      count: 0
    };
    set(state => ({ tags: [...state.tags, newTag] }));
    get().addLog('Update', `Added tag "${name}"`);
  },
  deleteTag: (id) => {
    const tag = get().tags.find(t => t.id === id);
    set(state => ({ tags: state.tags.filter(t => t.id !== id) }));
    get().addLog('Delete', `Deleted tag "${tag?.name || ''}"`);
  },
  mergeTags: (sourceId, targetId) => {
    const sourceTag = get().tags.find(t => t.id === sourceId);
    const targetTag = get().tags.find(t => t.id === targetId);
    if (!sourceTag || !targetTag) return;

    set(state => {
      // 1. Update tag counts
      const updatedTags = state.tags.map(t => {
        if (t.id === targetId) {
          return { ...t, count: t.count + sourceTag.count };
        }
        return t;
      }).filter(t => t.id !== sourceId);

      // 2. Update references in content items
      const updatedContent = state.contentList.map(item => {
        if (item.tags.includes(sourceTag.name)) {
          const filtered = item.tags.filter(t => t !== sourceTag.name);
          if (!filtered.includes(targetTag.name)) {
            filtered.push(targetTag.name);
          }
          return { ...item, tags: filtered };
        }
        return item;
      });

      return { tags: updatedTags, contentList: updatedContent };
    });

    get().addLog('Update', `Merged tag "${sourceTag.name}" into "${targetTag.name}"`);
  },

  // Media Actions
  uploadMediaItem: (file) => {
    const newItem: MediaItem = {
      id: `m-${Math.random().toString()}`,
      name: file.name,
      type: file.type as MediaItem['type'],
      url: file.url,
      size: file.size,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      folder: file.folder || 'Uploads'
    };
    set(state => ({ mediaLibrary: [newItem, ...state.mediaLibrary] }));
    get().addLog('Upload', `Uploaded media file "${file.name}" to Cloudflare R2`);
  },
  deleteMediaItem: (id) => {
    const file = get().mediaLibrary.find(m => m.id === id);
    set(state => ({ mediaLibrary: state.mediaLibrary.filter(m => m.id !== id) }));
    get().addLog('Delete', `Deleted media file "${file?.name || ''}"`);
  },
  renameMediaItem: (id, newName) => {
    set(state => ({
      mediaLibrary: state.mediaLibrary.map(m => m.id === id ? { ...m, name: newName } : m)
    }));
    get().addLog('Update', `Renamed media file to "${newName}"`);
  },

  // Comment Actions
  approveComment: (id) => {
    set(state => ({
      comments: state.comments.map(c => c.id === id ? { ...c, status: 'Approved' } : c)
    }));
    get().addLog('Update', `Approved a comment`);
  },
  rejectComment: (id) => {
    set(state => ({
      comments: state.comments.map(c => c.id === id ? { ...c, status: 'Rejected' } : c)
    }));
    get().addLog('Update', `Rejected a comment`);
  },
  deleteComment: (id) => {
    set(state => ({
      comments: state.comments.filter(c => c.id !== id)
    }));
    get().addLog('Delete', `Deleted a comment`);
  },

  // User Actions
  toggleUserStatus: (id) => {
    set(state => ({
      users: state.users.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u)
    }));
    const user = get().users.find(u => u.id === id);
    get().addLog('Update', `Toggled status of user "${user?.name}" to ${user?.status}`);
  },
  updateUserRole: async (id, role) => {
    try {
      await apiService.updateUserRole(id, role);
      set(state => ({
        users: state.users.map(u => u.id === id ? { ...u, role } : u)
      }));
      const user = get().users.find(u => u.id === id);
      get().addLog('Update', `Updated user "${user?.name || user?.email}" role to ${role}`);
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  },

  // UI States
  sidebarCollapsed: false,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  notificationCenterOpen: false,
  setNotificationCenterOpen: (open) => set({ notificationCenterOpen: open }),
  
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  // Search & Filter State
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  typeFilter: 'All Types',
  setTypeFilter: (type) => set({ typeFilter: type }),
  statusFilter: 'All Status',
  setStatusFilter: (status) => set({ statusFilter: status }),
  langFilter: 'All Languages',
  setLangFilter: (lang) => set({ langFilter: lang }),

  // Notification logs
  notifications: [],
  markAllNotificationsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    }));
  }
}));
