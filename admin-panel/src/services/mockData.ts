export interface ContentItem {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  type: 'Book' | 'Article' | 'Audio' | 'Video' | 'Meditation' | 'Quote' | 'Challenge' | 'Course' | 'Podcast';
  author: string;
  status: 'Draft' | 'Published' | 'Archived';
  views: number;
  bookmarks: number;
  downloads: number;
  language: string;
  category: string;
  tags: string[];
  featured: boolean;
  date: string;
  readingTime?: string;
  duration?: string;
  thumbnail: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  quoteText?: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon?: string;
  children?: Category[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  count: number;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  role: 'ADMIN' | 'USER';
  status?: 'Active' | 'Inactive';
  lastLogin?: string;
  permissions?: string[];
  token?: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'pdf';
  url: string;
  size: string;
  dimensions?: string;
  duration?: string;
  date: string;
  folder?: string;
}

export interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorAvatar: string;
  contentTitle: string;
  contentType: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
}

export interface ActivityLog {
  id: string;
  adminName: string;
  adminAvatar: string;
  action: 'Publish' | 'Delete' | 'Upload' | 'Update' | 'Auth';
  details: string;
  timestamp: string;
}

export const initialContent: ContentItem[] = [
  {
    id: "1",
    title: "The Science of Soul",
    subtitle: "Understanding the deeper self",
    slug: "the-science-of-soul",
    type: "Book",
    author: "Dr. Atmik Jain",
    status: "Published",
    views: 12400,
    bookmarks: 842,
    downloads: 3200,
    language: "English",
    category: "Spirituality",
    tags: ["Soul", "Science", "Wisdom"],
    featured: true,
    date: "May 18, 2026",
    readingTime: "45 mins",
    thumbnail: "/mock/science-of-soul.jpg",
    fileName: "science-of-soul.pdf",
    fileSize: "4.8 MB",
    fileUrl: "https://r2.atmik.ai/books/science-of-soul.pdf",
    quoteText: "The soul is not something you find, it is something you remember.",
    description: "A profound exploration of the soul through the lens of modern science and ancient wisdom. This book bridges the gap between spirituality and scientific understanding to help you discover your true essence.",
    seoTitle: "The Science of Soul Book — Dr. Atmik Jain",
    seoDescription: "Discover your true self with Dr. Atmik Jain's exploration of science and spirituality."
  },
  {
    id: "2",
    title: "Atmik Intelligence",
    subtitle: "Awakening the inner light",
    slug: "atmik-intelligence",
    type: "Book",
    author: "Dr. Atmik Jain",
    status: "Published",
    views: 8700,
    bookmarks: 512,
    downloads: 1800,
    language: "English",
    category: "Spirituality",
    tags: ["Atmik", "Awakening", "Light"],
    featured: false,
    date: "May 17, 2026",
    readingTime: "30 mins",
    thumbnail: "/mock/atmik-intelligence.jpg",
    fileName: "atmik-intelligence.pdf",
    fileSize: "3.2 MB",
    fileUrl: "https://r2.atmik.ai/books/atmik-intelligence.pdf",
    description: "Dive deep into the realm of Atmik intelligence to awaken your inner light and guide your daily decisions with spiritual clarity.",
    seoTitle: "Atmik Intelligence - Dr. Atmik Jain",
    seoDescription: "Awaken your inner light with the power of Atmik Intelligence."
  },
  {
    id: "3",
    title: "Meditation for Beginners",
    subtitle: "A step-by-step guide",
    slug: "meditation-for-beginners",
    type: "Video",
    author: "Team Admin",
    status: "Published",
    views: 6100,
    bookmarks: 640,
    downloads: 920,
    language: "Hindi",
    category: "Meditation",
    tags: ["Meditation", "Guide", "Peace"],
    featured: true,
    date: "May 16, 2026",
    duration: "24:15",
    thumbnail: "/mock/meditation-guide.jpg",
    fileName: "meditation-guide.mp4",
    fileSize: "45.2 MB",
    fileUrl: "https://r2.atmik.ai/videos/meditation-guide.mp4",
    description: "An easy-to-follow meditation guide for beginners to quiet the mind and find peace in everyday life.",
    seoTitle: "Meditation for Beginners Video Guide",
    seoDescription: "Start your meditation journey with this simple video walkthrough."
  },
  {
    id: "4",
    title: "Inner Peace - Audio",
    subtitle: "Guided meditation",
    slug: "inner-peace-audio",
    type: "Audio",
    author: "Team Admin",
    status: "Published",
    views: 4300,
    bookmarks: 310,
    downloads: 2300,
    language: "English",
    category: "Meditation",
    tags: ["Audio", "Inner Peace", "Mindfulness"],
    featured: false,
    date: "May 15, 2026",
    duration: "10:48",
    thumbnail: "/mock/peace-within.jpg",
    fileName: "peace-within.mp3",
    fileSize: "5.4 MB",
    fileUrl: "https://r2.atmik.ai/audios/peace-within.mp3",
    description: "Listen to this calming guided audio session to channel your inner peaceful state and reduce stress levels instantly.",
    seoTitle: "Inner Peace Guided Audio Meditation",
    seoDescription: "Quiet your mind with our 10-minute guided audio meditation."
  },
  {
    id: "5",
    title: "Understanding Karma",
    subtitle: "The law of cause and effect",
    slug: "understanding-karma",
    type: "Article",
    author: "Team Admin",
    status: "Draft",
    views: 0,
    bookmarks: 0,
    downloads: 0,
    language: "English",
    category: "Wisdom",
    tags: ["Karma", "Philosophy", "Cause and Effect"],
    featured: false,
    date: "May 14, 2026",
    readingTime: "8 mins",
    thumbnail: "/mock/wisdom-article.jpg",
    description: "An in-depth article analyzing the classical teachings of Karma, highlighting its practical application in modern choices.",
    seoTitle: "Understanding Karma - The Law of Cause and Effect",
    seoDescription: "A thorough review of the philosophical concepts of Karma and actions."
  },
  {
    id: "6",
    title: "Universal Prosperity",
    subtitle: "The dawn of a new era",
    slug: "universal-prosperity",
    type: "Book",
    author: "Dr. Atmik Jain",
    status: "Published",
    views: 3800,
    bookmarks: 245,
    downloads: 1100,
    language: "Hindi",
    category: "Spirituality",
    tags: ["Prosperity", "Abundance", "Spirituality"],
    featured: true,
    date: "May 13, 2026",
    readingTime: "50 mins",
    thumbnail: "/mock/universal-prosperity.jpg",
    description: "Learn to tap into the infinite supply of spiritual abundance and experience genuine, universal prosperity.",
    seoTitle: "Universal Prosperity Book - Dr. Atmik Jain",
    seoDescription: "Experience universal prosperity with the spiritual guides of Dr. Atmik Jain."
  },
  {
    id: "7",
    title: "The Golden Years",
    subtitle: "A new vision for elderly",
    slug: "the-golden-years",
    type: "Book",
    author: "Dr. Atmik Jain",
    status: "Archived",
    views: 2500,
    bookmarks: 142,
    downloads: 650,
    language: "English",
    category: "Spirituality",
    tags: ["Life", "Elderly", "Harmony"],
    featured: false,
    date: "May 10, 2026",
    readingTime: "35 mins",
    thumbnail: "/mock/golden-years.jpg",
    description: "This volume focuses on spiritual enrichment for the elderly, offering a harmonious vision for late-stage life.",
    seoTitle: "The Golden Years - Dr. Atmik Jain",
    seoDescription: "Offering spiritual guidance and vision for senior citizens."
  }
];

export const initialCategories: Category[] = [
  {
    id: "cat1",
    name: "Spirituality",
    slug: "spirituality",
    parentId: null,
    children: [
      { id: "cat1-1", name: "Atmik", slug: "atmik", parentId: "cat1" },
      { id: "cat1-2", name: "Soul Science", slug: "soul-science", parentId: "cat1" }
    ]
  },
  {
    id: "cat2",
    name: "Meditation",
    slug: "meditation",
    parentId: null,
    children: [
      { id: "cat2-1", name: "Mindfulness", slug: "mindfulness", parentId: "cat2" },
      { id: "cat2-2", name: "Guided", slug: "guided", parentId: "cat2" }
    ]
  },
  {
    id: "cat3",
    name: "Wisdom",
    slug: "wisdom",
    parentId: null,
    children: []
  }
];

export const initialTags: Tag[] = [
  { id: "t1", name: "Soul", slug: "soul", color: "#24385A", count: 18 },
  { id: "t2", name: "Science", slug: "science", color: "#D6A04A", count: 12 },
  { id: "t3", name: "Wisdom", slug: "wisdom", color: "#62B06E", count: 25 },
  { id: "t4", name: "Meditation", slug: "meditation", color: "#D45B5B", count: 32 },
  { id: "t5", name: "Awakening", slug: "awakening", color: "#8E7CC3", count: 9 },
  { id: "t6", name: "Karma", slug: "karma", color: "#45818E", count: 14 }
];

export const initialUsers: User[] = [];


export const initialMedia: MediaItem[] = [
  {
    id: "m1",
    name: "science-of-soul.jpg",
    type: "image",
    url: "/mock/science-of-soul.jpg",
    size: "400 KB",
    dimensions: "1200 x 1600",
    date: "May 18, 2026",
    folder: "Thumbnails"
  },
  {
    id: "m2",
    name: "meditation-cover.jpg",
    type: "image",
    url: "/mock/meditation-guide.jpg",
    size: "320 KB",
    dimensions: "1200 x 1600",
    date: "May 17, 2026",
    folder: "Thumbnails"
  },
  {
    id: "m3",
    name: "inner-peace.jpg",
    type: "image",
    url: "/mock/peace-within.jpg",
    size: "280 KB",
    dimensions: "1200 x 1600",
    date: "May 16, 2026",
    folder: "Thumbnails"
  },
  {
    id: "m4",
    name: "the-science-of-soul.pdf",
    type: "pdf",
    url: "https://r2.atmik.ai/books/science-of-soul.pdf",
    size: "4.8 MB",
    date: "May 18, 2026",
    folder: "Books"
  },
  {
    id: "m5",
    name: "atmik-intelligence.pdf",
    type: "pdf",
    url: "https://r2.atmik.ai/books/atmik-intelligence.pdf",
    size: "3.2 MB",
    date: "May 17, 2026",
    folder: "Books"
  },
  {
    id: "m6",
    name: "wisdom-article.jpg",
    type: "image",
    url: "/mock/wisdom-article.jpg",
    size: "210 KB",
    dimensions: "1200 x 800",
    date: "May 16, 2026",
    folder: "Articles"
  },
  {
    id: "m7",
    name: "peace-within.mp3",
    type: "audio",
    url: "https://r2.atmik.ai/audios/peace-within.mp3",
    size: "5.4 MB",
    duration: "10:48",
    date: "May 15, 2026",
    folder: "Audios"
  },
  {
    id: "m8",
    name: "meditation-guide.mp4",
    type: "video",
    url: "https://r2.atmik.ai/videos/meditation-guide.mp4",
    size: "45.2 MB",
    duration: "24:15",
    date: "May 15, 2026",
    folder: "Videos"
  }
];

export const initialComments: Comment[] = [
  {
    id: "c1",
    content: "This chapter on soul frequencies really resonates with me. It explains so much about human connections.",
    authorName: "Amit Verma",
    authorAvatar: "",
    contentTitle: "The Science of Soul",
    contentType: "Book",
    status: "Pending",
    date: "May 18, 2026"
  },
  {
    id: "c2",
    content: "The audio guided track has really helped me calm down my evening anxiety. Thank you, Team!",
    authorName: "Sneha Reddy",
    authorAvatar: "",
    contentTitle: "Inner Peace - Audio",
    contentType: "Audio",
    status: "Approved",
    date: "May 17, 2026"
  },
  {
    id: "c3",
    content: "Is there a translated Hindi edition available for the 'Atmik Intelligence' book?",
    authorName: "Rajesh Kumar",
    authorAvatar: "",
    contentTitle: "Atmik Intelligence",
    contentType: "Book",
    status: "Approved",
    date: "May 16, 2026"
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: "l1",
    adminName: "Arjun Dev",
    adminAvatar: "",
    action: "Publish",
    details: "New book 'The Science of Soul' published",
    timestamp: "2 mins ago"
  },
  {
    id: "l2",
    adminName: "Arjun Dev",
    adminAvatar: "",
    action: "Update",
    details: "Article 'Understanding Karma' updated",
    timestamp: "3 hours ago"
  },
  {
    id: "l3",
    adminName: "Rohan Sharma",
    adminAvatar: "",
    action: "Upload",
    details: "Audio 'Peace Within' uploaded",
    timestamp: "2 days ago"
  },
  {
    id: "l4",
    adminName: "System",
    adminAvatar: "",
    action: "Auth",
    details: "User Priya Patel registered",
    timestamp: "2 days ago"
  }
];
