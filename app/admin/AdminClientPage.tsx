'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import {
  useNews,
  useEvents,
  useGallery,
  usePublicServices,
  useOfficeInfo,
  useCategories,
  useWelcomeMessage,
  useHeroSlides,
  useHomepageSettings,
  usePriorityPrograms
} from '@/lib/data-store';
import {
  ShieldAlert,
  Newspaper,
  Image as ImageIcon,
  Calendar,
  FileText,
  Phone,
  LogOut,
  KeyRound,
  LayoutDashboard,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  CheckCircle,
  X,
  Upload,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  MapPin,
  Clock,
  Mail,
  Menu,
  User,
  Sliders,
  Monitor,
  Smartphone,
  Trophy,
  Users,
  Compass,
  Target,
  BookOpen,
  Heart,
  Award,
  Shield,
  Zap,
  Sparkles,
  Activity
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { HeroSlide, PriorityProgram, SocialMediaItem } from '@/lib/data';
import { parseIndonesianDate } from '@/lib/utils';

// Helper to parse Indonesian date format (e.g. "24 Mei 2026") to YYYY-MM-DD
const parseIndonesianDateToYYYYMMDD = (dateStr: string): string => {
  if (!dateStr) return '';
  const months: { [key: string]: string } = {
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'mei': '05', 'juni': '06',
    'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'jun': '06', 'jul': '07', 'agu': '08',
    'sep': '09', 'okt': '10', 'nov': '11', 'des': '12'
  };
  const parts = dateStr.toLowerCase().trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthName = parts[1];
    const year = parts[2];
    const month = months[monthName] || '01';
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return '';
};

// Helper to parse Time range (e.g. "08:00 - 12:00 WIB") into start and end times
const parseTimeRange = (timeStr?: string) => {
  if (!timeStr) return { start: '08:00', end: '12:00' };
  const cleaned = timeStr.replace(/wib/i, '').trim();
  const parts = cleaned.split('-');
  const start = parts[0] ? parts[0].trim() : '08:00';
  const end = parts[1] ? parts[1].trim() : '12:00';
  return { start, end };
};

const convertImageToWebP = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/webp', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type) && !/\.(webp|png|jpe?g)$/i.test(file.name)) {
      reject(new Error('Format gambar harus berupa WEBP, PNG, JPG, atau JPEG.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses gambar.'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const webpBase64 = canvas.toDataURL('image/webp', 0.85);
        resolve(webpBase64);
      };
      img.onerror = () => {
        reject(new Error('Gagal memuat gambar untuk konversi.'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Gagal membaca berkas gambar.'));
    };
    reader.readAsDataURL(file);
  });
};

const isValidUrlOrPath = (url?: string): boolean => {
  if (!url || url === '#' || url === '') return true;
  // Online URLs (http:// or https://)
  if (/^(https?:\/\/)/i.test(url)) return true;
  // Local paths starting with /, ./, or ../
  if (/^(\/|\.\/|\.\.\/)/.test(url)) return true;
  // Standard relative paths with query parameters and hash anchors
  if (/^[a-zA-Z0-9_\-\.\/?=#%&]+$/.test(url)) return true;
  return false;
};

export default function AdminClientPage({ initialIsLoggedIn, initialUsername }: { initialIsLoggedIn: boolean; initialUsername?: string }) {
  const router = useRouter();

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(initialIsLoggedIn);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  const [currentAdminUsername, setCurrentAdminUsername] = useState<string>(initialUsername || '');
  const [showAccountPassword, setShowAccountPassword] = useState<boolean>(false);
  const [accountSuccess, setAccountSuccess] = useState<string>('');
  const [accountError, setAccountError] = useState<string>('');

  // Dropdown & Modal States for Admin Profile
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [accountModalTab, setAccountModalTab] = useState<'profile' | 'users'>('profile');
  const [adminUsers, setAdminUsers] = useState<{ id: string; username: string }[]>([]);
  const [showNewAdminPassword, setShowNewAdminPassword] = useState<boolean>(false);
  const [newAdminUsername, setNewAdminUsername] = useState<string>('');
  const [newAdminPassword, setNewAdminPassword] = useState<string>('');
  const [newAdminError, setNewAdminError] = useState<string>('');
  const [newAdminSuccess, setNewAdminSuccess] = useState<string>('');

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'berita' | 'galeri' | 'agenda' | 'berkas' | 'kontak' | 'sambutan' | 'beranda' | 'akun'>('dashboard');

  // Dynamic Data States
  const [news, setNews] = useNews();
  const [events, setEvents] = useEvents();
  const [gallery, setGallery] = useGallery();
  const [services, setServices] = usePublicServices();
  const [officeInfo, setOfficeInfo] = useOfficeInfo();
  const [categoriesStore, setCategoriesStore] = useCategories();
  const [welcomeMessage, setWelcomeMessage] = useWelcomeMessage();
  const [heroSlides, setHeroSlides] = useHeroSlides();
  const [homepageSettings, setHomepageSettings] = useHomepageSettings();
  const [priorityPrograms, setPriorityPrograms] = usePriorityPrograms();
  const [formPoints, setFormPoints] = useState<string[]>(['']);

  // Beranda settings states
  const [isEditingBeranda, setIsEditingBeranda] = useState<boolean>(false);
  const [berandaSubTab, setBerandaSubTab] = useState<'hero' | 'programs'>('hero');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewSettings, setPreviewSettings] = useState<any>(null);

  // Sync preview settings with homepageSettings
  useEffect(() => {
    if (homepageSettings) {
      setPreviewSettings(homepageSettings);
    }
  }, [homepageSettings]);

  // Welcome message states
  const [isEditingWelcome, setIsEditingWelcome] = useState<boolean>(false);

  // Custom enhancement states
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isEditingContact, setIsEditingContact] = useState<boolean>(false);
  const [editingSocials, setEditingSocials] = useState<SocialMediaItem[]>([]);

  useEffect(() => {
    if (officeInfo) {
      setEditingSocials(officeInfo.socialMediaList || [
        { platform: 'instagram', label: 'Resmi', url: officeInfo.socialMedia?.instagramResmi || '' },
        { platform: 'instagram', label: 'Wisata', url: officeInfo.socialMedia?.instagramTourism || '' },
        { platform: 'instagram', label: 'Pemuda', url: officeInfo.socialMedia?.instagramPemuda || '' },
        { platform: 'youtube', label: 'YouTube', url: officeInfo.socialMedia?.youtube || '' }
      ]);
    }
  }, [officeInfo]);

  const handleCancelContact = () => {
    setIsEditingContact(false);
    if (officeInfo) {
      setEditingSocials(officeInfo.socialMediaList || [
        { platform: 'instagram', label: 'Resmi', url: officeInfo.socialMedia?.instagramResmi || '' },
        { platform: 'instagram', label: 'Wisata', url: officeInfo.socialMedia?.instagramTourism || '' },
        { platform: 'instagram', label: 'Pemuda', url: officeInfo.socialMedia?.instagramPemuda || '' },
        { platform: 'youtube', label: 'YouTube', url: officeInfo.socialMedia?.youtube || '' }
      ]);
    }
  };

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Semua');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [dashboardTab, setDashboardTab] = useState<'berita' | 'galeri' | 'agenda' | 'berkas'>('agenda');

  // Category Manager Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [categoryManagerTab, setCategoryManagerTab] = useState<'news' | 'gallery' | 'services'>('news');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');

  // CRUD Editing States
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete'>('add');

  // Search Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notification States
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // File Upload Helper State
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>('');
  const [welcomeImage, setWelcomeImage] = useState<string>('');
  const [isDragOverWelcome, setIsDragOverWelcome] = useState<boolean>(false);
  const [isDragOverModal, setIsDragOverModal] = useState<boolean>(false);

  // Document Upload Helper States
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');

  // No mount authentication check needed because it is handled by SSR cookies

  // Reset category filter on tab change
  useEffect(() => {
    setSelectedCategoryFilter('Semua');
    setIsFilterDropdownOpen(false);
  }, [activeTab]);

  // Sync homepage limits on mount if active items exceed limit
  const hasCheckedLimits = React.useRef(false);
  useEffect(() => {
    if (hasCheckedLimits.current) return;
    hasCheckedLimits.current = true;

    let newsChanged = false;
    let eventsChanged = false;
    let galleryChanged = false;
    let servicesChanged = false;

    // News: max 3
    const activeNews = news.filter(item => item.showOnHomepage !== false);
    let updatedNews = [...news];
    if (activeNews.length > 3) {
      let activeCount = 0;
      updatedNews = news.map(item => {
        if (item.showOnHomepage !== false) {
          activeCount++;
          if (activeCount > 3) {
            newsChanged = true;
            return { ...item, showOnHomepage: false };
          }
        }
        return item;
      });
    }

    // Events: max 4
    const activeEvents = events.filter(item => item.showOnHomepage !== false);
    let updatedEvents = [...events];
    if (activeEvents.length > 4) {
      let activeCount = 0;
      updatedEvents = events.map(item => {
        if (item.showOnHomepage !== false) {
          activeCount++;
          if (activeCount > 4) {
            eventsChanged = true;
            return { ...item, showOnHomepage: false };
          }
        }
        return item;
      });
    }

    // Gallery: max 5
    const activeGallery = gallery.filter(item => item.showOnHomepage !== false);
    let updatedGallery = [...gallery];
    if (activeGallery.length > 5) {
      let activeCount = 0;
      updatedGallery = gallery.map(item => {
        if (item.showOnHomepage !== false) {
          activeCount++;
          if (activeCount > 5) {
            galleryChanged = true;
            return { ...item, showOnHomepage: false };
          }
        }
        return item;
      });
    }

    // Services: max 3
    const activeServices = services.filter(item => item.showOnHomepage !== false);
    let updatedServices = [...services];
    if (activeServices.length > 3) {
      let activeCount = 0;
      updatedServices = services.map(item => {
        if (item.showOnHomepage !== false) {
          activeCount++;
          if (activeCount > 3) {
            servicesChanged = true;
            return { ...item, showOnHomepage: false };
          }
        }
        return item;
      });
    }

    if (newsChanged) setNews(updatedNews);
    if (eventsChanged) setEvents(updatedEvents);
    if (galleryChanged) setGallery(updatedGallery);
    if (servicesChanged) setServices(updatedServices);
  }, [news, events, gallery, services, setNews, setEvents, setGallery, setServices]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await signIn('credentials', {
        redirect: false,
        username,
        password
      });

      if (res?.error) {
        setLoginError('Username atau password salah.');
      } else {
        setIsLoggedIn(true);
        setCurrentAdminUsername(username);
        setLoginError('');
        // Clean up old session triggers
        document.cookie = "disporapar_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        sessionStorage.removeItem('disporapar_admin_session');
        showNotification('Berhasil masuk ke panel admin!', 'success');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setLoginError('Terjadi kesalahan sistem.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      setIsLoggedIn(false);
      sessionStorage.removeItem('disporapar_admin_session');
      showNotification('Berhasil keluar.', 'success');
      router.refresh();
    } catch (err) {
      console.error(err);
      showNotification('Gagal keluar dari sesi.', 'error');
    }
  };

  // Notification Trigger
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Convert File and automatically convert to WebP
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showNotification('Ukuran gambar maksimal 2MB.', 'error');
        e.target.value = '';
        return;
      }
      showNotification('Sedang mengompresi dan mengunggah gambar...', 'success');
      convertImageToWebP(file)
        .then(async (webpBase64) => {
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileBase64: webpBase64,
                fileName: file.name.substring(0, file.name.lastIndexOf('.')) + '.webp',
                menu: activeTab
              })
            });
            const result = await res.json();
            if (result.success) {
              setUploadedImageBase64(result.url);
              if (activeTab === 'sambutan') {
                setWelcomeImage(result.url);
              }
              showNotification('Gambar berhasil diunggah dan disimpan ke server.', 'success');
            } else {
              throw new Error(result.error || 'Gagal menyimpan gambar di server.');
            }
          } catch (err: any) {
            showNotification(err.message || 'Gagal mengunggah gambar ke server.', 'error');
            e.target.value = '';
          }
        })
        .catch((err) => {
          showNotification(err.message || 'Gagal memproses gambar.', 'error');
          e.target.value = '';
        });
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validDocExtensions = ['.pdf', '.zip', '.doc', '.docx'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validDocExtensions.includes(fileExtension)) {
        showNotification('Format berkas harus berupa PDF, ZIP, DOC, atau DOCX.', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Ukuran berkas maksimal 5MB.', 'error');
        e.target.value = '';
        return;
      }

      let sizeStr = '';
      if (file.size >= 1024 * 1024) {
        sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      } else {
        sizeStr = Math.round(file.size / 1024) + ' KB';
      }

      setUploadedFileSize(sizeStr);
      setUploadedFileName(file.name);
      showNotification('Sedang mengunggah berkas...', 'success');

      const reader = new FileReader();
      reader.onloadend = async () => {
        const docBase64 = reader.result as string;
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: docBase64,
              fileName: file.name,
              menu: activeTab
            })
          });
          const result = await res.json();
          if (result.success) {
            setUploadedFileBase64(result.url);
            showNotification('Berkas berhasil diunggah ke server.', 'success');
          } else {
            throw new Error(result.error || 'Gagal menyimpan berkas di server.');
          }
        } catch (err: any) {
          showNotification(err.message || 'Gagal mengunggah berkas ke server.', 'error');
          e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ==========================================
  // CRUD Actions
  // ==========================================

  // Open Form Modal
  const openForm = (type: 'add' | 'edit', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setUploadedImageBase64('');
    setUploadedFileBase64('');
    setUploadedFileName('');
    setUploadedFileSize('');
    if (activeTab === 'beranda' && berandaSubTab === 'programs') {
      if (type === 'add') {
        setFormPoints(['']);
      } else if (type === 'edit' && item) {
        setFormPoints(item.points ? [...item.points] : ['']);
      }
    }
    if (type === 'edit') {
      setUploadedImageBase64(item.imageUrl || item.image || '');
      if (activeTab === 'berkas' && item) {
        setUploadedFileSize(item.fileSize || '');
        if (item.downloadUrl && item.downloadUrl.startsWith('data:')) {
          setUploadedFileBase64(item.downloadUrl);
          setUploadedFileName('Berkas Terunggah');
        }
      }
    }
    setIsModalOpen(true);
  };

  // Open Delete Confirmation
  const openDeleteConfirm = (item: any) => {
    setModalType('delete');
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Handle Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    if (modalType === 'delete') {
      // Execute Delete
      if (activeTab === 'berita') {
        setNews(news.filter((n) => n.id !== editingItem.id));
      } else if (activeTab === 'galeri') {
        setGallery(gallery.filter((g) => g.id !== editingItem.id));
      } else if (activeTab === 'agenda') {
        setEvents(events.filter((ev) => ev.id !== editingItem.id));
      } else if (activeTab === 'berkas') {
        setServices(services.filter((s) => s.id !== editingItem.id));
      } else if (activeTab === 'beranda') {
        if (editingItem && (editingItem.points || editingItem.id.startsWith('prog-'))) {
          setPriorityPrograms(priorityPrograms.filter((p) => p.id !== editingItem.id));
        } else {
          setHeroSlides(heroSlides.filter((s) => s.id !== editingItem.id));
        }
      }
      showNotification('Data berhasil dihapus.', 'success');
      setIsModalOpen(false);
      setEditingItem(null);
      return;
    }

    // Validate online URLs if provided
    const imageUrlVal = formData.get('imageUrl') as string;
    const downloadUrlVal = formData.get('downloadUrl') as string;

    if (imageUrlVal && !isValidUrlOrPath(imageUrlVal)) {
      showNotification('Tautan URL gambar tidak valid.', 'error');
      return;
    }
    if (downloadUrlVal && !isValidUrlOrPath(downloadUrlVal)) {
      showNotification('Tautan URL berkas tidak valid.', 'error');
      return;
    }

    // Save Create / Update
    if (activeTab === 'berita') {
      const title = formData.get('title') as string;
      const content = formData.get('content') as string;
      // Auto-generate excerpt from content: take first 150 characters
      const cleanContent = content ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
      const excerpt = cleanContent.length > 150
        ? cleanContent.substring(0, 150) + '...'
        : cleanContent;
      const category = formData.get('category') as any;
      const author = formData.get('author') as string;
      const dateVal = formData.get('date') as string;
      let date = dateVal;
      if (dateVal) {
        const dateParts = dateVal.split('-');
        if (dateParts.length === 3) {
          const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      } else {
        date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      const imageUrl = uploadedImageBase64 || formData.get('imageUrl') as string || '';

      if (modalType === 'add') {
        const newItem = {
          id: `news-${Date.now()}`,
          title,
          excerpt,
          content,
          category,
          date,
          imageUrl,
          author,
          featured: formData.get('featured') === 'on'
        };
        setNews([newItem, ...news]);
        showNotification('Berita berhasil ditambahkan.', 'success');
      } else {
        setNews(news.map((item) => item.id === editingItem.id ? {
          ...item,
          title,
          excerpt,
          content,
          category,
          author,
          date,
          imageUrl,
          featured: formData.get('featured') === 'on'
        } : item));
        showNotification('Berita berhasil diubah.', 'success');
      }
    } else if (activeTab === 'galeri') {
      const title = formData.get('title') as string;
      const category = formData.get('category') as string;
      const imageUrl = uploadedImageBase64 || formData.get('imageUrl') as string || '';

      if (modalType === 'add') {
        const newItem = {
          id: `g-${Date.now()}`,
          title,
          category,
          imageUrl
        };
        setGallery([newItem, ...gallery]);
        showNotification('Foto galeri berhasil ditambahkan.', 'success');
      } else {
        setGallery(gallery.map((item) => item.id === editingItem.id ? {
          ...item,
          title,
          category,
          imageUrl
        } : item));
        showNotification('Foto galeri berhasil diubah.', 'success');
      }
    } else if (activeTab === 'agenda') {
      const title = formData.get('title') as string;
      const dateVal = formData.get('date') as string; // in YYYY-MM-DD
      const startTime = formData.get('startTime') as string || '08:00';
      const endTime = formData.get('endTime') as string || '12:00';
      const time = `${startTime} - ${endTime} WIB`;
      const location = formData.get('location') as string;
      const description = '';
      const imageUrl = uploadedImageBase64 || formData.get('imageUrl') as string || '';

      // Format YYYY-MM-DD to Indonesian "DD Bulan YYYY"
      let dateString = dateVal;
      if (dateVal) {
        const dateParts = dateVal.split('-');
        if (dateParts.length === 3) {
          const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          dateString = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      }

      if (modalType === 'add') {
        const newItem = {
          id: `e-${Date.now()}`,
          title,
          date: dateString,
          time,
          location,
          description,
          imageUrl
        };
        setEvents([newItem, ...events]);
        showNotification('Agenda berhasil ditambahkan.', 'success');
      } else {
        setEvents(events.map((item) => item.id === editingItem.id ? {
          ...item,
          title,
          date: dateString,
          time,
          location,
          description,
          imageUrl
        } : item));
        showNotification('Agenda berhasil diubah.', 'success');
      }
    } else if (activeTab === 'berkas') {
      const title = formData.get('title') as string;
      const description = '';
      const category = formData.get('category') as any;
      const urlInput = formData.get('downloadUrl') as string;
      const downloadUrl = uploadedFileBase64 || urlInput || '';
      let fileSize = '';

      if (modalType === 'add') {
        const newItem = {
          id: `s-${Date.now()}`,
          title,
          description,
          category,
          downloadUrl,
          fileSize
        };
        setServices([newItem, ...services]);
        showNotification('Berkas berhasil ditambahkan.', 'success');
      } else {
        setServices(services.map((item) => item.id === editingItem.id ? {
          ...item,
          title,
          description,
          category,
          downloadUrl,
          fileSize
        } : item));
        showNotification('Berkas berhasil diubah.', 'success');
      }
    } else if (activeTab === 'beranda') {
      if (berandaSubTab === 'programs') {
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const points = formPoints.filter((pt) => pt.trim() !== '');

        if (!title.trim()) {
          showNotification('Judul wajib diisi.', 'error');
          return;
        }
        if (!description.trim()) {
          showNotification('Deskripsi wajib diisi.', 'error');
          return;
        }
        if (points.length < 1 || points.length > 3) {
          showNotification('Jumlah poin program harus antara 1 sampai 3.', 'error');
          return;
        }

        if (modalType === 'add') {
          if (priorityPrograms.length >= 3) {
            showNotification('Maksimal hanya 3 pilar program prioritas yang diperbolehkan.', 'error');
            return;
          }
          const newItem: PriorityProgram = {
            id: `prog-${Date.now()}`,
            title,
            description,
            points
          };
          setPriorityPrograms([...priorityPrograms, newItem]);
          showNotification('Pilar Program Prioritas berhasil ditambahkan.', 'success');
        } else {
          setPriorityPrograms(priorityPrograms.map((item) => item.id === editingItem.id ? {
            ...item,
            title,
            description,
            points
          } : item));
          showNotification('Pilar Program Prioritas berhasil diubah.', 'success');
        }
      } else {
        const title = formData.get('title') as string;
        const cta = formData.get('cta') as string;
        const href = formData.get('href') as string;
        const image = uploadedImageBase64 || formData.get('imageUrl') as string || '';

        if (modalType === 'add') {
          const newItem: HeroSlide = {
            id: `slide-${Date.now()}`,
            tagline: '',
            title,
            cta,
            href,
            image
          };
          setHeroSlides([...heroSlides, newItem]);
          showNotification('Slide Beranda berhasil ditambahkan.', 'success');
        } else {
          setHeroSlides(heroSlides.map((item) => item.id === editingItem.id ? {
            ...item,
            tagline: '',
            title,
            cta,
            href,
            image
          } : item));
          showNotification('Slide Beranda berhasil diubah.', 'success');
        }
      }
    }

    setIsModalOpen(false);
    setEditingItem(null);
    setUploadedImageBase64('');
  };

  // Handle Account Update
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    const formData = new FormData(e.target as HTMLFormElement);
    const newUsername = formData.get('newUsername') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!newUsername.trim()) {
      setAccountError('Username baru tidak boleh kosong.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setAccountError('Password baru harus minimal 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setAccountError('Konfirmasi password baru tidak cocok.');
        return;
      }
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'adminAccount',
          data: {
            username: currentAdminUsername,
            newUsername,
            newPassword: newPassword || undefined
          }
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        setAccountError(resData.error || 'Gagal memperbarui akun.');
      } else {
        setAccountSuccess('Akun admin berhasil diperbarui! Anda akan dialihkan keluar...');
        setCurrentAdminUsername(newUsername);
        showNotification('Akun admin berhasil diperbarui!', 'success');

        setTimeout(() => {
          handleLogout();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setAccountError('Terjadi kesalahan koneksi.');
    }
  };

  // Fetch all admin users
  const fetchAdminUsers = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setAdminUsers(data.users);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin users', err);
    }
  };

  // Handle Create Admin Account
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewAdminError('');
    setNewAdminSuccess('');

    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      setNewAdminError('Username dan password wajib diisi.');
      return;
    }

    if (newAdminPassword.length < 6) {
      setNewAdminError('Password harus minimal 6 karakter.');
      return;
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'createAdmin',
          data: {
            username: newAdminUsername.trim(),
            password: newAdminPassword.trim()
          }
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        setNewAdminError(resData.error || 'Gagal menambahkan admin.');
      } else {
        setNewAdminSuccess('Admin baru berhasil ditambahkan.');
        setNewAdminUsername('');
        setNewAdminPassword('');
        fetchAdminUsers();
        showNotification('Admin baru berhasil ditambahkan!', 'success');
      }
    } catch (err) {
      console.error(err);
      setNewAdminError('Terjadi kesalahan koneksi.');
    }
  };

  // Handle Delete Admin Account
  const handleDeleteAdmin = async (id: string, nameToDelete: string) => {
    if (nameToDelete === currentAdminUsername) {
      showNotification('Anda tidak dapat menghapus akun Anda sendiri.', 'error');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus admin "${nameToDelete}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deleteAdmin',
          data: { id }
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        showNotification(resData.error || 'Gagal menghapus admin.', 'error');
      } else {
        showNotification('Admin berhasil dihapus.', 'success');
        fetchAdminUsers();
      }
    } catch (err) {
      console.error(err);
      showNotification('Terjadi kesalahan koneksi.', 'error');
    }
  };

  // Fetch admin users list when modal opens
  useEffect(() => {
    if (isAccountModalOpen) {
      fetchAdminUsers();
      setNewAdminUsername('');
      setNewAdminPassword('');
      setNewAdminError('');
      setNewAdminSuccess('');
      setAccountError('');
      setAccountSuccess('');
    }
  }, [isAccountModalOpen]);

  // Handle Contact Office Update
  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const operationalHours = formData.get('operationalHours') as string;
    const gmapsEmbedUrl = formData.get('gmapsEmbedUrl') as string;

    const cleanSocials = editingSocials.filter(s => s.url.trim() !== '');
    const firstIg = cleanSocials.find(s => s.platform === 'instagram')?.url || '';
    const firstYt = cleanSocials.find(s => s.platform === 'youtube')?.url || '';

    setOfficeInfo({
      address,
      phone,
      email,
      operationalHours,
      socialMedia: {
        instagramResmi: firstIg,
        instagramTourism: cleanSocials.find(s => s.platform === 'instagram' && s.label === 'Wisata')?.url || '',
        instagramPemuda: cleanSocials.find(s => s.platform === 'instagram' && s.label === 'Pemuda')?.url || '',
        youtube: firstYt
      },
      gmapsEmbedUrl,
      socialMediaList: cleanSocials
    });

    setIsEditingContact(false);
    showNotification('Informasi kontak dinas berhasil diperbarui!', 'success');
  };

  // Handle Delete Social Media Item (saves immediately when not in edit mode)
  const handleDeleteSocialRow = (index: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus media sosial ini?')) return;
    const newList = editingSocials.filter((_, i) => i !== index);
    setEditingSocials(newList);

    const cleanSocials = newList.filter(s => s.url.trim() !== '');
    const firstIg = cleanSocials.find(s => s.platform === 'instagram')?.url || '';
    const firstYt = cleanSocials.find(s => s.platform === 'youtube')?.url || '';

    setOfficeInfo({
      ...officeInfo,
      socialMedia: {
        instagramResmi: firstIg,
        instagramTourism: cleanSocials.find(s => s.platform === 'instagram' && s.label === 'Wisata')?.url || '',
        instagramPemuda: cleanSocials.find(s => s.platform === 'instagram' && s.label === 'Pemuda')?.url || '',
        youtube: firstYt
      },
      gmapsEmbedUrl: officeInfo.gmapsEmbedUrl,
      socialMediaList: cleanSocials
    });

    showNotification('Media sosial berhasil dihapus.', 'success');
  };

  // Handle Welcome Message Update
  const handleUpdateWelcomeMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const nip = formData.get('nip') as string || '';
    const content = formData.get('content') as string;

    if (welcomeImage && !welcomeImage.startsWith('data:') && !isValidUrlOrPath(welcomeImage)) {
      showNotification('Tautan URL foto tidak valid.', 'error');
      return;
    }

    setWelcomeMessage({
      name,
      nip,
      content,
      imageUrl: welcomeImage
    });

    setIsEditingWelcome(false);
    showNotification('Sambutan berhasil diperbarui!', 'success');
  };

  // Cascade Category Changes
  const cascadeRenameCategory = (moduleType: 'news' | 'gallery' | 'services', oldName: string, newName: string) => {
    if (moduleType === 'news') {
      setNews(news.map(item => item.category === oldName ? { ...item, category: newName } : item));
    } else if (moduleType === 'gallery') {
      setGallery(gallery.map(item => item.category === oldName ? { ...item, category: newName } : item));
    } else if (moduleType === 'services') {
      setServices(services.map(item => item.category === oldName ? { ...item, category: newName } : item));
    }
  };

  const cascadeDeleteCategory = (moduleType: 'news' | 'gallery' | 'services', catName: string, fallback: string) => {
    if (moduleType === 'news') {
      setNews(news.map(item => item.category === catName ? { ...item, category: fallback } : item));
    } else if (moduleType === 'gallery') {
      setGallery(gallery.map(item => item.category === catName ? { ...item, category: fallback } : item));
    } else if (moduleType === 'services') {
      setServices(services.map(item => item.category === catName ? { ...item, category: fallback } : item));
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    const currentList = categoriesStore[categoryManagerTab] || [];
    if (currentList.includes(name)) {
      showNotification('Kategori sudah ada.', 'error');
      return;
    }
    const updated = {
      ...categoriesStore,
      [categoryManagerTab]: [...currentList, name]
    };
    setCategoriesStore(updated);
    setNewCategoryName('');
    showNotification('Kategori berhasil ditambahkan.', 'success');
  };

  const handleSaveCategoryRename = (oldName: string, index: number) => {
    if (!editingCategoryName.trim()) return;
    const newName = editingCategoryName.trim();
    if (oldName === newName) {
      setEditingCategoryIndex(null);
      return;
    }
    const currentList = categoriesStore[categoryManagerTab] || [];
    if (currentList.includes(newName)) {
      showNotification('Nama kategori sudah digunakan.', 'error');
      return;
    }
    const updatedList = currentList.map((c, i) => i === index ? newName : c);
    const updated = {
      ...categoriesStore,
      [categoryManagerTab]: updatedList
    };
    setCategoriesStore(updated);
    setEditingCategoryIndex(null);
    cascadeRenameCategory(categoryManagerTab, oldName, newName);
    showNotification('Kategori berhasil diubah.', 'success');
  };

  const handleDeleteCategory = (catName: string) => {
    const currentList = categoriesStore[categoryManagerTab] || [];
    const updatedList = currentList.filter(c => c !== catName);
    const updated = {
      ...categoriesStore,
      [categoryManagerTab]: updatedList
    };
    setCategoriesStore(updated);
    cascadeDeleteCategory(categoryManagerTab, catName, updatedList[0] || '');
    showNotification('Kategori berhasil dihapus.', 'success');
  };

  const toggleNewsHomepage = (id: string) => {
    setNews(news.map(item => item.id === id ? { ...item, showOnHomepage: !(item.showOnHomepage !== false) } : item));
    showNotification('Status tampilan berita di beranda berhasil diubah.', 'success');
  };

  const toggleGalleryHomepage = (id: string) => {
    setGallery(gallery.map(item => item.id === id ? { ...item, showOnHomepage: !(item.showOnHomepage !== false) } : item));
    showNotification('Status tampilan galeri di beranda berhasil diubah.', 'success');
  };

  const toggleEventsHomepage = (id: string) => {
    setEvents(events.map(item => item.id === id ? { ...item, showOnHomepage: !(item.showOnHomepage !== false) } : item));
    showNotification('Status tampilan agenda di beranda berhasil diubah.', 'success');
  };

  const toggleServicesHomepage = (id: string) => {
    setServices(services.map(item => item.id === id ? { ...item, showOnHomepage: !(item.showOnHomepage !== false) } : item));
    showNotification('Status tampilan berkas di beranda berhasil diubah.', 'success');
  };

  // Filter lists based on search query
  const getFilteredData = () => {
    if (activeTab === 'berita') {
      return news.filter((item) => {
        const matchesCategory = selectedCategoryFilter === 'Semua' || item.category === selectedCategoryFilter;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      }).sort((a, b) => {
        try {
          return parseIndonesianDate(b.date).getTime() - parseIndonesianDate(a.date).getTime();
        } catch {
          return 0;
        }
      });
    } else if (activeTab === 'galeri') {
      return gallery.filter((item) => {
        const matchesCategory = selectedCategoryFilter === 'Semua' || item.category === selectedCategoryFilter;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });
    } else if (activeTab === 'agenda') {
      return events.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      }).sort((a, b) => {
        try {
          return parseIndonesianDate(b.date).getTime() - parseIndonesianDate(a.date).getTime();
        } catch {
          return 0;
        }
      });
    } else if (activeTab === 'berkas') {
      return services.filter((item) => {
        const matchesCategory = selectedCategoryFilter === 'Semua' || item.category === selectedCategoryFilter;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });
    }
    return [];
  };

  // ==========================================
  // Dashboard Chart Calculations
  // ==========================================
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const fullMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const getMonthIndex = (dateStr?: string): number => {
    if (!dateStr) return -1;
    const lower = dateStr.toLowerCase();
    if (lower.includes('januari') || lower.includes('jan')) return 0;
    if (lower.includes('februari') || lower.includes('feb')) return 1;
    if (lower.includes('maret') || lower.includes('mar')) return 2;
    if (lower.includes('april') || lower.includes('apr')) return 3;
    if (lower.includes('mei')) return 4;
    if (lower.includes('juni') || lower.includes('jun')) return 5;
    if (lower.includes('juli') || lower.includes('jul')) return 6;
    if (lower.includes('agustus') || lower.includes('agu')) return 7;
    if (lower.includes('september') || lower.includes('sep')) return 8;
    if (lower.includes('oktober') || lower.includes('okt')) return 9;
    if (lower.includes('november') || lower.includes('nov')) return 10;
    if (lower.includes('desember') || lower.includes('des')) return 11;
    return -1;
  };

  const currentMonthIdx = new Date().getMonth();
  const lineChartMonths = Array.from({ length: 6 }).map((_, i) => {
    const idx = (currentMonthIdx - (5 - i) + 12) % 12;
    return {
      short: shortMonths[idx],
      full: fullMonths[idx],
      index: idx
    };
  });

  const getMonthlyActivityCount = (monthIdx: number): number => {
    // 1. News Count
    const newsCount = news.filter((item) => {
      const part = item.id.split('-')[1];
      const timestamp = part ? Number(part) : NaN;
      if (!isNaN(timestamp) && timestamp > 1000000000000) {
        return new Date(timestamp).getMonth() === monthIdx;
      }
      return getMonthIndex(item.date) === monthIdx;
    }).length;

    // 2. Events Count
    const eventsCount = events.filter((item) => {
      const part = item.id.split('-')[1];
      const timestamp = part ? Number(part) : NaN;
      if (!isNaN(timestamp) && timestamp > 1000000000000) {
        return new Date(timestamp).getMonth() === monthIdx;
      }
      return getMonthIndex(item.date) === monthIdx;
    }).length;

    // 3. Gallery Count
    const galleryCount = gallery.filter((item) => {
      const part = item.id.split('-')[1];
      const timestamp = part ? Number(part) : NaN;
      if (!isNaN(timestamp) && timestamp > 1000000000000) {
        return new Date(timestamp).getMonth() === monthIdx;
      }
      // Distribute initial gallery photos (g-1 to g-8) logically:
      // g-1, g-2 -> Feb (1), g-3, g-4 -> Mar (2), g-5, g-6 -> Apr (3), g-7, g-8 -> Mei (4)
      const num = Number(item.id.replace('g-', ''));
      if (!isNaN(num)) {
        if (num <= 2) return monthIdx === 1; // Feb
        if (num <= 4) return monthIdx === 2; // Mar
        if (num <= 6) return monthIdx === 3; // Apr
        return monthIdx === 4; // Mei
      }
      return false;
    }).length;

    // 4. Services (Berkas) Count
    const servicesCount = services.filter((item) => {
      const part = item.id.split('-')[1];
      const timestamp = part ? Number(part) : NaN;
      if (!isNaN(timestamp) && timestamp > 1000000000000) {
        return new Date(timestamp).getMonth() === monthIdx;
      }
      // Distribute initial services (s-1 to s-10):
      // s-1, s-2 -> Jan (0), s-3, s-4 -> Feb (1), s-5, s-6 -> Mar (2), s-7, s-8 -> Apr (3), s-9, s-10 -> Mei (4)
      const num = Number(item.id.replace('s-', ''));
      if (!isNaN(num)) {
        if (num <= 2) return monthIdx === 0;
        if (num <= 4) return monthIdx === 1;
        if (num <= 6) return monthIdx === 2;
        if (num <= 8) return monthIdx === 3;
        return monthIdx === 4;
      }
      return false;
    }).length;

    // 5. Slides Count
    const slidesCount = heroSlides.filter((item) => {
      const part = item.id.split('-')[1];
      const timestamp = part ? Number(part) : NaN;
      if (!isNaN(timestamp) && timestamp > 1000000000000) {
        return new Date(timestamp).getMonth() === monthIdx;
      }
      // Initial slides in Jan (0)
      return monthIdx === 0;
    }).length;

    return newsCount + eventsCount + galleryCount + servicesCount + slidesCount;
  };

  const activityCounts = lineChartMonths.map(m => getMonthlyActivityCount(m.index));
  const maxActivityVal = Math.max(10, ...activityCounts);

  const lineChartPoints = lineChartMonths.map((m, idx) => {
    const x = 45 + idx * 87;
    const count = activityCounts[idx];
    const y = 180 - (count / maxActivityVal) * 150;
    return { x, y, count, label: m.short };
  });

  const linePathD = "M " + lineChartPoints.map(p => `${p.x},${p.y}`).join(" L ");
  const areaPathD = `M ${lineChartPoints[0].x},180 L ` + lineChartPoints.map(p => `${p.x},${p.y}`).join(" L ") + ` L ${lineChartPoints[lineChartPoints.length - 1].x},180 Z`;

  const barChartData = [
    { name: 'Berita', x: 55, val: news.length, color: '#2D9CDB' },
    { name: 'Galeri', x: 135, val: gallery.length, color: '#9B51E0' },
    { name: 'Agenda', x: 215, val: events.length, color: '#F2994A' },
    { name: 'Berkas', x: 295, val: services.length, color: '#27AE60' }
  ];

  const maxBarVal = Math.max(10, ...barChartData.map(b => b.val));

  // Render Auth Checking Spinner removed to allow direct instant server-side page load

  // ==========================================
  // Render Login Panel
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-tr from-[#051424] via-[#0E3B66] to-[#124b82] flex items-center justify-center p-4 selection:bg-accent selection:text-white font-sans text-slate-800">

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 sm:p-10 rounded-[2rem] shadow-2xl relative z-10 text-white flex flex-col justify-between">
          <div className="text-center space-y-3.5">
            <div className="flex justify-center mb-6">
              <Logo variant="dark" className="scale-110" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5 text-left font-inter text-slate-700">
            {loginError && (
              <div className="bg-red-500/25 border border-red-500/50 p-4 rounded-xl text-red-100 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-200" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-200 tracking-wider uppercase font-mono">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username admin123"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-white placeholder-slate-400 transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-200 tracking-wider uppercase font-mono">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password admin123"
                  className="w-full pl-4 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-white placeholder-slate-400 transition-all font-medium animate-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-accent hover:bg-orange-500 text-white font-extrabold rounded-xl transition-all shadow-lg active:scale-98 font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                MASUK PANEL ADMIN
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-white/10 pt-4 text-center">
            <Link
              href="/"
              className="text-[10px] font-bold text-sky-300 hover:text-white uppercase tracking-widest font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Kembali Ke Beranda</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render Authenticated Admin Panel Layout
  // ==========================================
  return (
    <div className="w-full min-h-screen md:h-screen md:overflow-hidden bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 relative">

      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-[100] px-5 py-4 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-bold font-inter transition-all animate-fade-in ${notification.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Sidebar backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#051424] text-white flex flex-col justify-between shrink-0 shadow-lg border-r border-white/5 transition-transform duration-300 md:translate-x-0 md:static md:h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex flex-col gap-2 w-full select-none">
              <Logo variant="dark" className="scale-90 origin-left pointer-events-none" />
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 md:hidden transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="p-4 space-y-1 font-mono text-xs uppercase tracking-wider">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'beranda', name: 'Konten Beranda', icon: <Sliders className="w-4 h-4" /> },
              { id: 'sambutan', name: 'Sambutan', icon: <User className="w-4 h-4" /> },
              { id: 'agenda', name: 'Agenda Event', icon: <Calendar className="w-4 h-4" /> },
              { id: 'berita', name: 'Berita', icon: <Newspaper className="w-4 h-4" /> },
              { id: 'galeri', name: 'Galeri Foto', icon: <ImageIcon className="w-4 h-4" /> },
              { id: 'berkas', name: 'Berkas Layanan', icon: <FileText className="w-4 h-4" /> },
              { id: 'kontak', name: 'Info Kontak', icon: <Phone className="w-4 h-4" /> }
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchQuery('');
                    setSelectedCategoryFilter('Semua');
                    setIsSidebarOpen(false); // Close sidebar on mobile after selecting tab
                    if (tab.id === 'sambutan') {
                      setUploadedImageBase64(welcomeMessage.imageUrl || '');
                      setIsEditingWelcome(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer font-bold text-left ${active
                    ? 'bg-accent text-white shadow-md shadow-accent/15'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User logout section */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-[#0084d1] transition-all text-[10px] font-mono font-bold uppercase tracking-widest"
          >
            <span>Buka Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* 2. MAIN PANEL WORKSPACE */}
      <main className="flex-grow md:h-full flex flex-col min-w-0 relative z-10 overflow-hidden">

        {/* Top Header section */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Menu toggle button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-1 text-[#0E3B66] hover:bg-slate-100 rounded-xl md:hidden transition-colors cursor-pointer shrink-0"
              title="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0E3B66] uppercase tracking-tight flex items-center gap-1.5 sm:gap-2 leading-none truncate">
                <span>Panel Kendali</span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500 capitalize truncate">{activeTab === 'beranda' ? 'Konten Beranda' : activeTab}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer select-none"
            >
              <div className="w-7 h-7 rounded-full bg-[#0E3B66] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {(currentAdminUsername || 'A')[0].toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-[#0E3B66]">
                {currentAdminUsername || 'Admin'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180 text-[#0E3B66]' : ''}`} />
            </button>

            {isProfileDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsProfileDropdownOpen(false)}
                />
                {/* Dropdown menu */}
                <div className="absolute right-0 top-full mt-2 w-48 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-1.5 animate-fade-in text-left">
                  <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                    <p className="text-xs font-bold text-[#0E3B66] truncate">{currentAdminUsername || 'Admin'}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">Administrator</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setAccountModalTab('profile');
                      setIsAccountModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-450" />
                    <span>Edit Akun</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 hover:text-red-700 transition-colors text-xs font-bold text-red-650 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* View Component Switch */}
        <section className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col justify-between">
          <div className="flex-grow">

            {/* A. DASHBOARD VIEW WITH GRAPHS */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fade-in text-left">

                {/* Stat summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { title: 'Total Berita', count: news.length, icon: <Newspaper className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50/50 border-blue-100' },
                    { title: 'Dokumentasi Galeri', count: gallery.length, icon: <ImageIcon className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50/50 border-purple-100' },
                    { title: 'Agenda Terdaftar', count: events.length, icon: <Calendar className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50/50 border-amber-100' },
                    { title: 'Berkas Unduhan', count: services.length, icon: <FileText className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50/50 border-emerald-100' }
                  ].map((stat, i) => (
                    <div key={i} className={`p-4 rounded-2xl bg-white border shadow-xs flex items-center justify-between ${stat.bg}`}>
                      <div className="min-w-0 text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block leading-none truncate">{stat.title}</span>
                        <span className="text-2xl sm:text-3xl font-black text-[#0E3B66] font-mono block mt-1.5 leading-none">{stat.count}</span>
                      </div>
                      <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-xs shrink-0 ml-3">
                        {stat.icon}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ========================================================================= */}
                {/* VISUAL CHARTS (GRAPH) ROW - PREMIUM CUSTOM SVG CHARTS */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                  {/* 1. Monthly Activity Line Chart (7 columns - 60% split) */}
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-[#0E3B66] tracking-tight flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-accent" />
                          <span>Tren Aktivitas Bulanan</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-inter mt-1">Total unggahan berita & agenda bulanan</p>
                      </div>
                      <span className="bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold font-mono px-2.5 py-1 rounded-md uppercase">LINE CHART</span>
                    </div>

                    {/* Line Chart Draw Area */}
                    <div className="relative w-full h-64 border border-slate-100/50 bg-slate-50/50 rounded-2xl p-4 flex items-center justify-center select-none font-inter text-[9px] font-medium text-slate-400">
                      <svg viewBox="0 0 500 230" className="w-full h-full overflow-visible">
                        {/* Grid Lines */}
                        <line x1="45" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="45" y1="65" x2="480" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="45" y1="110" x2="480" y2="110" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="45" y1="155" x2="480" y2="155" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="45" y1="180" x2="480" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />

                        {/* Y-Axis Labels */}
                        <text x="35" y="24" textAnchor="end" className="font-semibold fill-slate-400 text-[10px]">{maxActivityVal}</text>
                        <text x="35" y="69" textAnchor="end" className="font-semibold fill-slate-400 text-[10px]">{Math.round(maxActivityVal * 0.75)}</text>
                        <text x="35" y="114" textAnchor="end" className="font-semibold fill-slate-400 text-[10px]">{Math.round(maxActivityVal * 0.5)}</text>
                        <text x="35" y="159" textAnchor="end" className="font-semibold fill-slate-400 text-[10px]">{Math.round(maxActivityVal * 0.25)}</text>
                        <text x="35" y="184" textAnchor="end" className="font-semibold fill-slate-400 text-[10px]">0</text>

                        {/* X-Axis Labels (Months) */}
                        {lineChartPoints.map((pt, idx) => (
                          <text key={idx} x={pt.x} y="208" textAnchor="middle" className="font-bold fill-slate-500 text-[10px]">{pt.label}</text>
                        ))}

                        {/* SVG Gradient definition */}
                        <defs>
                          <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F2994A" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#F2994A" stopOpacity="0" />
                          </linearGradient>
                        </defs>

                        {/* Area under line */}
                        <path
                          d={areaPathD}
                          fill="url(#line-gradient)"
                          className="transition-all duration-500 ease-out"
                        />

                        {/* Glowing Line */}
                        <path
                          d={linePathD}
                          fill="none"
                          stroke="#F2994A"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                          style={{ filter: 'drop-shadow(0px 3px 6px rgba(242,153,74,0.3))' }}
                        />

                        {/* Interactive Data Dots */}
                        {lineChartPoints.map((pt, idx) => (
                          <g key={idx} className="group cursor-pointer">
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="7"
                              className="fill-white stroke-accent stroke-[3] group-hover:r-[9] transition-all"
                            />
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="14"
                              className="fill-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                            {/* Tooltip on top */}
                            <text
                              x={pt.x}
                              y={pt.y - 14}
                              textAnchor="middle"
                              className="opacity-0 group-hover:opacity-100 fill-[#0E3B66] font-bold text-[10px] transition-opacity"
                            >
                              {pt.count} Aktivitas
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>

                  {/* 2. Category Distribution Bar Chart (5 columns - 40% split) */}
                  <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-[#0E3B66] tracking-tight flex items-center gap-2">
                          <Sliders className="w-5 h-5 text-purple-650" />
                          <span>Distribusi Data Modul</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-inter mt-1">Jumlah data aktif per kategori konten</p>
                      </div>
                      <span className="bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold font-mono px-2.5 py-1 rounded-md uppercase">BAR CHART</span>
                    </div>

                    {/* Bar Chart Draw Area */}
                    <div className="relative w-full h-64 border border-slate-100/50 bg-slate-50/50 rounded-2xl p-5 flex items-center justify-center select-none font-inter text-[9px] font-medium text-slate-400">
                      <svg viewBox="0 0 350 210" className="w-full h-full overflow-visible">
                        {/* Grid Lines */}
                        <line x1="30" y1="20" x2="330" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="30" y1="70" x2="330" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="30" y1="120" x2="330" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="30" y1="160" x2="330" y2="160" stroke="#cbd5e1" strokeWidth="1" />

                        {/* X-Axis Labels */}
                        {barChartData.map((bar, idx) => {
                          const barHeight = Math.max(15, (bar.val / maxBarVal) * 125);
                          const y = 160 - barHeight;

                          return (
                            <g key={idx} className="group cursor-pointer">
                              {/* Bar gradient definitions inside group is fine */}
                              <defs>
                                <linearGradient id={`bar-gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={bar.color} />
                                  <stop offset="100%" stopColor={bar.color} stopOpacity="0.3" />
                                </linearGradient>
                              </defs>

                              {/* Bar Graphic */}
                              <rect
                                x={bar.x - 18}
                                y={y}
                                width="36"
                                height={barHeight}
                                rx="6"
                                fill={`url(#bar-gradient-${idx})`}
                                className="transition-all duration-550 group-hover:fill-opacity-90"
                              />

                              {/* Count on top of bar */}
                              <text
                                x={bar.x}
                                y={y - 8}
                                textAnchor="middle"
                                className="font-bold fill-slate-800 font-mono text-[10px]"
                              >
                                {bar.val}
                              </text>

                              {/* Label */}
                              <text
                                x={bar.x}
                                y="185"
                                textAnchor="middle"
                                className="font-bold fill-slate-550 text-[10px]"
                              >
                                {bar.name}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                </div>

                {/* Homepage Publication Manager */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-[#0E3B66] tracking-tight">Manajer Publikasi Beranda</h3>
                    </div>

                    {/* Sub-tabs inside Dashboard */}
                    <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                      {[
                        { id: 'agenda', name: 'Agenda' },
                        { id: 'berita', name: 'Berita' },
                        { id: 'galeri', name: 'Galeri' },
                        { id: 'berkas', name: 'Berkas' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDashboardTab(tab.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono transition-colors text-center cursor-pointer select-none ${dashboardTab === tab.id
                            ? 'bg-[#0E3B66] text-white shadow-xs'
                            : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                            }`}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Contents */}
                  <div className="space-y-6 max-h-[450px] overflow-y-auto pr-1">
                    {/* 1. Berita Tab */}
                    {dashboardTab === 'berita' && (() => {
                      const sortedNews = [...news].sort((a, b) => {
                        try {
                          return parseIndonesianDate(b.date).getTime() - parseIndonesianDate(a.date).getTime();
                        } catch {
                          return 0;
                        }
                      });
                      const activeItems = sortedNews.filter(item => item.showOnHomepage !== false);
                      const inactiveItems = sortedNews.filter(item => item.showOnHomepage === false);
                      return (
                        <div className="space-y-5">
                          {/* Active Group */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">Aktif di Beranda ({activeItems.length}/3)</span>
                            </div>
                            {activeItems.length > 0 ? (
                              activeItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-emerald-50/15 border border-emerald-100 rounded-2xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-bold text-xs sm:text-sm text-[#0E3B66] leading-snug tracking-tight truncate max-w-md sm:max-w-xl">{item.title}</h4>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block mt-1 uppercase">KATEGORI: {item.category} • {item.date}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleNewsHomepage(item.id)}
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>TAMPIL</span>
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p className="text-left pl-2 text-xs text-slate-400 font-inter font-light">Belum ada berita yang ditampilkan di beranda.</p>
                            )}
                          </div>

                          {/* Inactive Group */}
                          <div className="space-y-2 pt-5 mt-4 border-t border-slate-300">
                            {inactiveItems.length > 0 ? (
                              inactiveItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/30 border border-slate-100 rounded-2xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-bold text-xs sm:text-sm text-[#0E3B66] leading-snug tracking-tight truncate max-w-md sm:max-w-xl">{item.title}</h4>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block mt-1 uppercase">KATEGORI: {item.category} • {item.date}</span>
                                    </div>
                                  </div>
                                  {activeItems.length < 3 ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleNewsHomepage(item.id)}
                                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>SEMBUNYI</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider bg-slate-100 border border-slate-200 text-slate-350 flex items-center gap-1.5 cursor-not-allowed shrink-0 select-none"
                                      title="Limit 3 berita tercapai. Sembunyikan berita lain terlebih dahulu."
                                    >
                                      <X className="w-3.5 h-3.5 text-slate-350" />
                                      <span>LIMIT</span>
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-left pl-2 text-xs text-slate-400 font-inter font-light">Semua berita sudah ditampilkan di beranda.</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Galeri Tab */}
                    {dashboardTab === 'galeri' && (() => {
                      const activeItems = gallery.filter(item => item.showOnHomepage !== false);
                      const inactiveItems = gallery.filter(item => item.showOnHomepage === false);
                      return (
                        <div className="space-y-5">
                          {/* Active Group */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono block">Aktif di Beranda ({activeItems.length}/5)</span>
                            {activeItems.length > 0 ? (
                              activeItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-emerald-50/15 border border-emerald-100 rounded-2xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-bold text-xs sm:text-sm text-[#0E3B66] leading-snug tracking-tight truncate max-w-md sm:max-w-xl">{item.title}</h4>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block mt-1 uppercase">KATEGORI: {item.category}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleGalleryHomepage(item.id)}
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>TAMPIL</span>
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p className="text-left pl-2 text-xs text-slate-400 font-inter font-light">Belum ada foto yang ditampilkan di beranda.</p>
                            )}
                          </div>

                          {/* Inactive Group */}
                          <div className="space-y-2 pt-5 mt-4 border-t border-slate-300">
                            {inactiveItems.length > 0 ? (
                              inactiveItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/30 border border-slate-100 rounded-2xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-bold text-xs sm:text-sm text-[#0E3B66] leading-snug tracking-tight truncate max-w-md sm:max-w-xl">{item.title}</h4>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block mt-1 uppercase">KATEGORI: {item.category}</span>
                                    </div>
                                  </div>
                                  {activeItems.length < 5 ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleGalleryHomepage(item.id)}
                                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>SEMBUNYI</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider bg-slate-100 border border-slate-200 text-slate-350 flex items-center gap-1.5 cursor-not-allowed shrink-0 select-none"
                                      title="Limit 5 foto galeri tercapai. Sembunyikan foto lain terlebih dahulu."
                                    >
                                      <X className="w-3.5 h-3.5 text-slate-350" />
                                      <span>LIMIT</span>
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-left pl-2 text-xs text-slate-400 font-inter font-light">Semua foto sudah ditampilkan di beranda.</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. Agenda Tab */}
                    {dashboardTab === 'agenda' && (() => {
                      const sortedEvents = [...events].sort((a, b) => {
                        try {
                          return parseIndonesianDate(b.date).getTime() - parseIndonesianDate(a.date).getTime();
                        } catch {
                          return 0;
                        }
                      });
                      const activeItems = sortedEvents.filter(item => item.showOnHomepage !== false);
                      const inactiveItems = sortedEvents.filter(item => item.showOnHomepage === false);
                      return (
                        <div className="space-y-5">
                          {/* Active Group */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono block">Aktif di Beranda ({activeItems.length}/4)</span>
                            {activeItems.length > 0 ? (
                              activeItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-emerald-50/15 border border-emerald-100 rounded-2xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                                      <Calendar className="w-6 h-6" />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-bold text-xs sm:text-sm text-[#0E3B66] leading-snug tracking-tight truncate max-w-md sm:max-w-xl">{item.title}</h4>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block mt-1 uppercase">LOKASI: {item.location} • {item.date} ({item.time})</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleEventsHomepage(item.id)}
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>TAMPIL</span>
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p className="text-left pl-2 text-xs text-slate-400 font-inter font-light">Belum ada agenda yang ditampilkan di beranda.</p>
                            )}
                          </div>

                          {/* Inactive Group */}
                          <div className="space-y-2 pt-5 mt-4 border-t border-slate-300">
                            {inactiveItems.length > 0 ? (
                              inactiveItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/30 border border-slate-100 rounded-2xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                                      <Calendar className="w-6 h-6" />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-bold text-xs sm:text-sm text-[#0E3B66] leading-snug tracking-tight truncate max-w-md sm:max-w-xl">{item.title}</h4>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block mt-1 uppercase">LOKASI: {item.location} • {item.date} ({item.time})</span>
                                    </div>
                                  </div>
                                  {activeItems.length < 4 ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleEventsHomepage(item.id)}
                                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>SEMBUNYI</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider bg-slate-100 border border-slate-200 text-slate-350 flex items-center gap-1.5 cursor-not-allowed shrink-0 select-none"
                                      title="Limit 4 agenda tercapai. Sembunyikan agenda lain terlebih dahulu."
                                    >
                                      <X className="w-3.5 h-3.5 text-slate-350" />
                                      <span>LIMIT</span>
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-left pl-2 text-xs text-slate-400 font-inter font-light">Semua agenda sudah ditampilkan di beranda.</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. Berkas Tab */}
                    {dashboardTab === 'berkas' && (() => {
                      const activeItems = services.filter(item => item.showOnHomepage !== false);
                      const inactiveItems = services.filter(item => item.showOnHomepage === false);
                      return (
                        <div className="space-y-5">
                          {/* Active Group */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono block">Aktif di Beranda ({activeItems.length}/3)</span>
                            {activeItems.length > 0 ? (
                              activeItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-emerald-50/15 border border-emerald-100 rounded-2xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                                      <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-bold text-xs sm:text-sm text-[#0E3B66] leading-snug tracking-tight truncate max-w-md sm:max-w-xl">{item.title}</h4>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block mt-1 uppercase">KATEGORI: {item.category}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleServicesHomepage(item.id)}
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>TAMPIL</span>
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p className="text-left pl-2 text-xs text-slate-400 font-inter font-light">Belum ada berkas yang ditampilkan di beranda.</p>
                            )}
                          </div>

                          {/* Inactive Group */}
                          <div className="space-y-2 pt-5 mt-4 border-t border-slate-300">
                            {inactiveItems.length > 0 ? (
                              inactiveItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/30 border border-slate-100 rounded-2xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                                      <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-bold text-xs sm:text-sm text-[#0E3B66] leading-snug tracking-tight truncate max-w-md sm:max-w-xl">{item.title}</h4>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block mt-1 uppercase">KATEGORI: {item.category}</span>
                                    </div>
                                  </div>
                                  {activeItems.length < 3 ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleServicesHomepage(item.id)}
                                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>SEMBUNYI</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider bg-slate-100 border border-slate-200 text-slate-350 flex items-center gap-1.5 cursor-not-allowed shrink-0 select-none"
                                      title="Limit 3 berkas tercapai. Sembunyikan berkas lain terlebih dahulu."
                                    >
                                      <X className="w-3.5 h-3.5 text-slate-350" />
                                      <span>LIMIT</span>
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-left pl-2 text-xs text-slate-400 font-inter font-light">Semua berkas sudah ditampilkan di beranda.</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            )}

            {/* B. CRUD TABVIEWS (BERITA, GALERI, AGENDA, BERKAS) */}
            {['berita', 'galeri', 'agenda', 'berkas'].includes(activeTab) && (
              <div className="space-y-6 animate-fade-in">
                {/* Control Action bar - STICKY SEARCH & FILTERS */}
                <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-md transition-all duration-300">

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-72">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder={`Cari ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 transition-all font-medium font-inter"
                      />
                    </div>

                    {/* Category Filter Dropdown */}
                    {activeTab !== 'agenda' && (
                      <div className="w-full sm:w-44 relative font-inter">
                        <button
                          type="button"
                          onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 transition-all font-medium flex items-center justify-between cursor-pointer select-none text-xs sm:text-sm ${isFilterDropdownOpen ? 'border-accent ring-2 ring-accent/20' : 'border-slate-200'
                            }`}
                        >
                          <span>{selectedCategoryFilter === 'Semua' ? 'Semua Kategori' : selectedCategoryFilter}</span>
                          <ChevronDown className={`w-4 h-4 text-slate-450 transition-transform duration-200 shrink-0 ${isFilterDropdownOpen ? 'rotate-180 text-accent' : ''}`} />
                        </button>

                        {isFilterDropdownOpen && (
                          <>
                            {/* Backdrop overlay to close dropdown */}
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setIsFilterDropdownOpen(false)}
                            />
                            {/* Options dropdown menu */}
                            <div className="absolute left-0 right-0 mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-1 animate-fade-in text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategoryFilter('Semua');
                                  setIsFilterDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors text-xs sm:text-sm font-semibold flex items-center justify-between ${selectedCategoryFilter === 'Semua' ? 'text-accent bg-accent/5 font-extrabold' : 'text-slate-700'
                                  }`}
                              >
                                <span>Semua Kategori</span>
                              </button>
                              {(activeTab === 'berita' ? categoriesStore.news : activeTab === 'galeri' ? categoriesStore.gallery : categoriesStore.services).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategoryFilter(c);
                                    setIsFilterDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors text-xs sm:text-sm font-semibold flex items-center justify-between ${selectedCategoryFilter === c ? 'text-accent bg-accent/5 font-extrabold' : 'text-slate-700'
                                    }`}
                                >
                                  <span>{c}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                    {activeTab !== 'agenda' && (
                      <button
                        type="button"
                        onClick={() => {
                          const moduleMap: Record<string, 'news' | 'gallery' | 'services'> = {
                            'berita': 'news',
                            'galeri': 'gallery',
                            'berkas': 'services'
                          };
                          setCategoryManagerTab(moduleMap[activeTab] || 'news');
                          setIsCategoryModalOpen(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0E3B66] font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-wider cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#0E3B66]" />
                        <span>Kategori</span>
                      </button>
                    )}
                    <button
                      onClick={() => openForm('add')}
                      className="w-full sm:w-auto px-5 py-2.5 bg-accent hover:bg-orange-500 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Tambah {activeTab}</span>
                    </button>
                  </div>
                </div>

                {/* Data Table / List */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm font-inter">
                      <thead>
                        <tr className="bg-[#051424] text-white font-mono text-[10px] tracking-widest uppercase border-b border-slate-200">
                          {activeTab === 'berita' && (
                            <>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Berita</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Kategori</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Tanggal</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Penulis</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6 text-center">Aksi</th>
                            </>
                          )}
                          {activeTab === 'galeri' && (
                            <>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Media</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Judul Foto</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Kategori</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6 text-center">Aksi</th>
                            </>
                          )}
                          {activeTab === 'agenda' && (
                            <>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Agenda</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Waktu &amp; Tanggal</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Lokasi</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6 text-center">Aksi</th>
                            </>
                          )}
                          {activeTab === 'berkas' && (
                            <>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Nama Berkas</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Kategori</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6 text-center">Aksi</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {getFilteredData().length > 0 ? (
                          (getFilteredData() as any[]).map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Berita Row rendering */}
                              {activeTab === 'berita' && (
                                <>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 max-w-xs">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                        <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="font-bold text-[#0E3B66] truncate leading-tight">{item.title}</h4>
                                        <p className="text-[10px] text-slate-400 truncate mt-1">{item.excerpt}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 uppercase font-mono text-[10px] tracking-wider text-slate-550">{item.category}</td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 text-slate-550 font-mono text-[11px] whitespace-nowrap">{item.date}</td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 text-[#0E3B66] font-bold">{item.author}</td>
                                </>
                              )}

                              {/* Galeri Row rendering */}
                              {activeTab === 'galeri' && (
                                <>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 whitespace-nowrap">
                                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shadow-xs border border-slate-100">
                                      <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 max-w-xs font-bold text-[#0E3B66]">{item.title}</td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 uppercase font-mono text-[10px] tracking-wider text-slate-550">{item.category}</td>
                                </>
                              )}

                              {activeTab === 'agenda' && (
                                <>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 max-w-xs">
                                    <h4 className="font-bold text-[#0E3B66] leading-tight">{item.title}</h4>
                                  </td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 text-slate-550 whitespace-nowrap">
                                    <div className="font-bold text-[11px]">{item.date}</div>
                                    <div className="text-[10px] mt-0.5 font-mono text-slate-400">{item.time}</div>
                                  </td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 text-slate-600 font-inter">{item.location}</td>
                                </>
                              )}

                              {/* Berkas Row rendering */}
                              {activeTab === 'berkas' && (
                                <>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 max-w-xs">
                                    <h4 className="font-bold text-[#0E3B66] leading-tight">{item.title}</h4>
                                  </td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 uppercase font-mono text-[10px] tracking-wider text-slate-550">{item.category}</td>
                                </>
                              )}

                              {/* Actions Column */}
                              <td className="py-3 px-3 sm:py-4.5 sm:px-6 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => openForm('edit', item)}
                                    className="p-2 bg-slate-50 hover:bg-[#0E3B66] hover:text-white border border-slate-200 rounded-lg text-[#0E3B66] transition-colors cursor-pointer"
                                    title="Ubah data"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteConfirm(item)}
                                    className="p-2 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg text-red-650 transition-colors cursor-pointer"
                                    title="Hapus data"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={10} className="py-16 text-center text-slate-400">
                              <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                              <h4 className="font-extrabold text-slate-800 text-sm">Tidak ada data ditemukan</h4>
                              <p className="text-xs text-slate-400 mt-1 font-light">Coba ubah kata kunci pencarian Anda.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* C. INFO KONTAK EDIT VIEW */}
            {activeTab === 'kontak' && (
              <div className="space-y-6 animate-fade-in text-left">
                <form onSubmit={handleUpdateContact} className="space-y-6 font-inter">

                  {/* Action Header Card */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#0E3B66]">Informasi Kontak Dinas</h3>
                    </div>
                    {isEditingContact ? (
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={handleCancelContact}
                          className="h-10 px-5 flex items-center justify-center font-extrabold border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all shadow-md font-mono text-xs uppercase tracking-wider cursor-pointer select-none"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="h-10 px-5 flex items-center justify-center font-extrabold bg-accent hover:bg-orange-500 text-white rounded-xl transition-all shadow-md font-mono text-xs uppercase tracking-wider cursor-pointer select-none border border-transparent"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingContact(true)}
                        className="h-10 px-6 flex items-center justify-center font-extrabold bg-[#0E3B66] hover:bg-[#0c3359] text-white rounded-xl transition-all shadow-md font-mono text-xs uppercase tracking-wider cursor-pointer select-none border border-transparent shrink-0"
                      >
                        Edit Kontak
                      </button>
                    )}
                  </div>

                  {/* 1. Informasi Kontak Grid 2 Kolom */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
                    <h4 className="text-sm font-extrabold text-[#0E3B66] border-b border-slate-100 pb-2.5">Data Kontak Utama</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Alamat */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Alamat Lengkap Kantor</label>
                        <textarea
                          required
                          rows={4}
                          name="address"
                          defaultValue={officeInfo.address}
                          disabled={!isEditingContact}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 placeholder-slate-400 transition-all font-medium disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/50 resize-none h-[122px]"
                        />
                      </div>

                      {/* Right: Telepon, Email, Jam Kerja */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">No. Telepon Resmi</label>
                            <input
                              type="text"
                              required
                              name="phone"
                              defaultValue={officeInfo.phone}
                              disabled={!isEditingContact}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 placeholder-slate-400 transition-all font-medium disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/50"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Alamat Email Resmi</label>
                            <input
                              type="email"
                              required
                              name="email"
                              defaultValue={officeInfo.email}
                              disabled={!isEditingContact}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 placeholder-slate-400 transition-all font-medium disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/50"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Jam Kerja Operasional</label>
                          <input
                            type="text"
                            required
                            name="operationalHours"
                            defaultValue={officeInfo.operationalHours}
                            disabled={!isEditingContact}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 placeholder-slate-400 transition-all font-medium disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Tabel Media Sosial */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-extrabold text-[#0E3B66]">Daftar Media Sosial Dinas</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditingContact) {
                            setIsEditingContact(true);
                          }
                          setEditingSocials([...editingSocials, { platform: 'instagram', label: '', url: '' }]);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-accent hover:bg-orange-500 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider cursor-pointer border border-transparent"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Tambah Media Sosial</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm font-inter">
                        <thead>
                          <tr className="bg-[#051424] text-white font-mono text-[10px] tracking-widest uppercase border-b border-slate-200">
                            <th className="py-4 px-6 w-1/5">Platform</th>
                            <th className="py-4 px-6 w-1/4">Nama Akun (Label)</th>
                            <th className="py-4 px-6">URL Tautan</th>
                            <th className="py-4 px-6 text-center w-1/6">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {editingSocials.map((social, index) => {
                            const moveUp = () => {
                              if (index === 0) return;
                              const newList = [...editingSocials];
                              const temp = newList[index];
                              newList[index] = newList[index - 1];
                              newList[index - 1] = temp;
                              setEditingSocials(newList);
                            };

                            const moveDown = () => {
                              if (index === editingSocials.length - 1) return;
                              const newList = [...editingSocials];
                              const temp = newList[index];
                              newList[index] = newList[index + 1];
                              newList[index + 1] = temp;
                              setEditingSocials(newList);
                            };

                            const updateField = (field: 'platform' | 'label' | 'url', value: string) => {
                              const newList = [...editingSocials];
                              newList[index] = { ...newList[index], [field]: value };
                              setEditingSocials(newList);
                            };

                            const removeRow = () => {
                              const newList = editingSocials.filter((_, i) => i !== index);
                              setEditingSocials(newList);
                            };

                            const platformLabel = social.platform.charAt(0).toUpperCase() + social.platform.slice(1);

                            return (
                              <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                {/* Platform Selector */}
                                <td className="py-4 px-6">
                                  {isEditingContact ? (
                                    <select
                                      value={social.platform}
                                      onChange={(e) => updateField('platform', e.target.value as any)}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent text-slate-800 cursor-pointer"
                                    >
                                      <option value="instagram">Instagram</option>
                                      <option value="youtube">YouTube</option>
                                      <option value="facebook">Facebook</option>
                                      <option value="x">X (Twitter)</option>
                                      <option value="tiktok">TikTok</option>
                                      <option value="whatsapp">WhatsApp</option>
                                      <option value="telegram">Telegram</option>
                                      <option value="linkedin">LinkedIn</option>
                                    </select>
                                  ) : (
                                    <span className="text-slate-800 font-bold uppercase tracking-wider text-[10px] bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                                      {platformLabel === 'X' ? 'X (Twitter)' : platformLabel}
                                    </span>
                                  )}
                                </td>

                                {/* Nama Akun (Label) */}
                                <td className="py-4 px-6">
                                  {isEditingContact ? (
                                    <input
                                      type="text"
                                      value={social.label}
                                      onChange={(e) => updateField('label', e.target.value)}
                                      placeholder="Keterangan (misal: Resmi)"
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent text-slate-800 placeholder-slate-400"
                                    />
                                  ) : (
                                    <span className="text-slate-800 font-bold text-xs">{social.label}</span>
                                  )}
                                </td>

                                {/* URL Tautan */}
                                <td className="py-4 px-6">
                                  {isEditingContact ? (
                                    <input
                                      type="text"
                                      value={social.url}
                                      onChange={(e) => updateField('url', e.target.value)}
                                      placeholder="https://..."
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent text-slate-800 placeholder-slate-400 font-mono"
                                    />
                                  ) : (
                                    <a
                                      href={social.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-accent hover:text-orange-500 font-mono text-xs flex items-center gap-1 hover:underline truncate max-w-xs sm:max-w-md"
                                    >
                                      <span className="truncate">{social.url}</span>
                                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                    </a>
                                  )}
                                </td>

                                {/* Aksi */}
                                <td className="py-4 px-6">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {isEditingContact ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={moveUp}
                                          disabled={index === 0}
                                          className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-[#0E3B66] disabled:opacity-30 disabled:hover:text-slate-500 cursor-pointer transition-colors"
                                          title="Pindahkan ke atas"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={moveDown}
                                          disabled={index === editingSocials.length - 1}
                                          className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-[#0E3B66] disabled:opacity-30 disabled:hover:text-slate-500 cursor-pointer transition-colors"
                                          title="Pindahkan ke bawah"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={removeRow}
                                          className="p-1.5 bg-red-50 border border-red-100 hover:bg-red-650 hover:text-white rounded-lg text-red-650 shrink-0 cursor-pointer transition-colors flex items-center justify-center"
                                          title="Hapus"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setIsEditingContact(true)}
                                          className="p-1.5 bg-slate-50 hover:bg-[#0E3B66] hover:text-white border border-slate-200 rounded-lg text-[#0E3B66] transition-colors cursor-pointer"
                                          title="Ubah data"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSocialRow(index)}
                                          className="p-1.5 bg-red-50 hover:bg-red-650 hover:text-white border border-red-100 rounded-lg text-red-650 shrink-0 cursor-pointer transition-colors flex items-center justify-center"
                                          title="Hapus"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {editingSocials.length === 0 && (
                      <div className="bg-slate-50 py-10 text-center border-t border-slate-200">
                        <p className="text-xs text-slate-450 italic select-none font-inter">Belum ada media sosial terhubung.</p>
                      </div>
                    )}
                  </div>

                  {/* 3. Google Maps Card Tersendiri */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-4">
                    <div>
                      <h4 className="text-sm font-extrabold text-[#0E3B66]">Lokasi Google Maps</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Google Maps Embed URL</label>
                        <input
                          type="text"
                          required
                          name="gmapsEmbedUrl"
                          defaultValue={officeInfo.gmapsEmbedUrl}
                          disabled={!isEditingContact}
                          placeholder="Masukkan URL embed google maps (https://www.google.com/maps/embed?...)"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 placeholder-slate-400 transition-all font-medium disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/50 font-mono"
                        />
                      </div>

                      {officeInfo.gmapsEmbedUrl && (
                        <div className="relative w-full h-60 rounded-2xl overflow-hidden border border-slate-150 bg-slate-50 shadow-inner">
                          <iframe
                            title="Preview Peta Lokasi Kantor"
                            src={officeInfo.gmapsEmbedUrl}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            className="w-full h-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                </form>
              </div>
            )}

            {/* KONTEN BERANDA CRUD VIEW */}
            {activeTab === 'beranda' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Sub-tab Navigation */}
                <div className="flex border-b border-slate-200 mb-6 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-200/60 max-w-md">
                  <button
                    type="button"
                    onClick={() => setBerandaSubTab('hero')}
                    className={`flex-1 py-2.5 text-center text-xs uppercase tracking-wider font-extrabold font-mono rounded-xl transition-all cursor-pointer ${berandaSubTab === 'hero'
                      ? 'bg-[#0E3B66] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                      }`}
                  >
                    Hero Slider
                  </button>
                  <button
                    type="button"
                    onClick={() => setBerandaSubTab('programs')}
                    className={`flex-1 py-2.5 text-center text-xs uppercase tracking-wider font-extrabold font-mono rounded-xl transition-all cursor-pointer ${berandaSubTab === 'programs'
                      ? 'bg-[#0E3B66] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                      }`}
                  >
                    Pilar Program Prioritas
                  </button>
                </div>

                {berandaSubTab === 'hero' ? (
                  <div className="space-y-6">
                    {/* Control Action bar */}
                    <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-md">
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-[#0E3B66] tracking-tight">Kelola Slide Hero Beranda</h3>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setBerandaSubTab('programs')}
                          className="w-full sm:w-auto px-5 py-2.5 bg-slate-50 hover:bg-[#0E3B66] hover:text-white text-[#0E3B66] font-extrabold rounded-xl border border-slate-200 transition-all shadow-sm flex items-center justify-center gap-2 font-mono text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer"
                        >
                          <span>Kelola Pilar Program</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openForm('add')}
                          className="w-full sm:w-auto px-5 py-2.5 bg-accent hover:bg-orange-500 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 font-mono text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-white" />
                          <span>Tambah Slide</span>
                        </button>
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm font-inter">
                          <thead>
                            <tr className="bg-[#051424] text-white font-mono text-[10px] tracking-widest uppercase border-b border-slate-200">
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6 w-24">Gambar</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Judul</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Tombol CTA</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Tautan (Link)</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {heroSlides.length > 0 ? (
                              heroSlides.map((slide) => (
                                <tr key={slide.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 whitespace-nowrap">
                                    <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-slate-100 shadow-xs border border-slate-100">
                                      <Image src={slide.image} alt={slide.title} fill className="object-cover" />
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 max-w-xs">
                                    <h4 className="font-bold text-[#0E3B66] leading-tight">{slide.title}</h4>
                                  </td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 text-slate-650 font-bold">{slide.cta}</td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 font-mono text-[11px] text-slate-500 truncate max-w-[150px]" title={slide.href}>
                                    {slide.href}
                                  </td>
                                  <td className="py-3 px-3 sm:py-4.5 sm:px-6 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => openForm('edit', slide)}
                                        className="p-2 bg-slate-50 hover:bg-[#0E3B66] hover:text-white border border-slate-200 rounded-lg text-[#0E3B66] transition-colors cursor-pointer"
                                        title="Ubah slide"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => openDeleteConfirm(slide)}
                                        className="p-2 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg text-red-650 transition-colors cursor-pointer"
                                        title="Hapus slide"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-16 text-center text-slate-400">
                                  <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                  <h4 className="font-extrabold text-slate-800 text-sm">Tidak ada slide hero</h4>
                                  <p className="text-xs text-slate-400 mt-1 font-light">Tambahkan slide untuk menampilkan banner di Beranda.</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Control Action bar */}
                    <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-md">
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-[#0E3B66] tracking-tight">Kelola Pilar Program Prioritas</h3>
                      </div>
                      <button
                        onClick={() => {
                          if (priorityPrograms.length >= 3) {
                            showNotification('Maksimal hanya 3 pilar program prioritas yang diperbolehkan.', 'error');
                            return;
                          }
                          openForm('add');
                        }}
                        disabled={priorityPrograms.length >= 3}
                        className={`w-full sm:w-auto px-5 py-2.5 font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 font-mono text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer ${priorityPrograms.length >= 3
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                          : 'bg-accent hover:bg-orange-500 text-white'
                          }`}
                        title={priorityPrograms.length >= 3 ? "Maksimal 3 item program" : "Tambah pilar program"}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Pilar Program</span>
                      </button>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm font-inter">
                          <thead>
                            <tr className="bg-[#051424] text-white font-mono text-[10px] tracking-widest uppercase border-b border-slate-200">
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Judul Program</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6">Deskripsi & Poin</th>
                              <th className="py-3 px-3 sm:py-4.5 sm:px-6 text-center w-28">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {priorityPrograms.length > 0 ? (
                              [...priorityPrograms]
                                .sort((a, b) => a.id.localeCompare(b.id))
                                .map((program) => {
                                  return (
                                    <tr key={program.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="py-4 px-3 sm:py-5 sm:px-6 max-w-xs">
                                        <h4 className="font-extrabold text-[#0E3B66] leading-tight">{program.title}</h4>
                                        <span className="text-[10px] font-mono text-slate-400 mt-1 block">ID: {program.id}</span>
                                      </td>
                                      <td className="py-4 px-3 sm:py-5 sm:px-6 max-w-md">
                                        <p className="text-slate-500 text-xs font-light leading-relaxed mb-3 line-clamp-2">{program.description}</p>
                                        <ul className="space-y-1.5 border-t border-slate-100 pt-2.5">
                                          {program.points?.map((pt, pIdx) => (
                                            <li key={pIdx} className="flex items-center gap-2 text-xs text-slate-650">
                                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                              <span className="truncate">{pt}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </td>
                                      <td className="py-4 px-3 sm:py-5 sm:px-6 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            onClick={() => openForm('edit', program)}
                                            className="p-2 bg-slate-50 hover:bg-[#0E3B66] hover:text-white border border-slate-200 rounded-lg text-[#0E3B66] transition-colors cursor-pointer"
                                            title="Ubah program"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => openDeleteConfirm(program)}
                                            className="p-2 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg text-red-650 transition-colors cursor-pointer"
                                            title="Hapus program"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                            ) : (
                              <tr>
                                <td colSpan={3} className="py-16 text-center text-slate-400">
                                  <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                  <h4 className="font-extrabold text-slate-800 text-sm">Tidak ada pilar program</h4>
                                  <p className="text-xs text-slate-400 mt-1 font-light">Tambahkan pilar program prioritas untuk ditampilkan di Beranda.</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* D. SAMBUTAN EDIT VIEW */}
            {activeTab === 'sambutan' && (
              <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-10 animate-fade-in text-left">
                <form onSubmit={handleUpdateWelcomeMessage} className="space-y-6 font-inter">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#0E3B66]">Kelola Sambutan Kepala Dinas</h3>
                    </div>
                    {isEditingWelcome ? (
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingWelcome(false);
                            setWelcomeImage('');
                          }}
                          className="h-11 px-5 flex items-center justify-center font-extrabold border border-slate-200 text-slate-700 hover:bg-slate-55 rounded-xl transition-all shadow-md font-mono text-xs uppercase tracking-wider cursor-pointer select-none"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="h-11 px-5 flex items-center justify-center font-extrabold bg-accent hover:bg-orange-500 text-white rounded-xl transition-all shadow-md font-mono text-xs uppercase tracking-wider cursor-pointer select-none border border-transparent"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingWelcome(true);
                          setWelcomeImage(welcomeMessage.imageUrl || '');
                        }}
                        className="h-11 px-6 flex items-center justify-center font-extrabold bg-[#0E3B66] hover:bg-[#0c3359] text-white rounded-xl transition-all shadow-md font-mono text-xs uppercase tracking-wider cursor-pointer select-none border border-transparent shrink-0"
                      >
                        Edit Sambutan
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left side: Photo upload & preview */}
                    <div className="lg:col-span-4 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Foto Kepala Dinas</label>

                      <div className={`relative aspect-[4/5] w-full max-w-[240px] mx-auto rounded-2xl overflow-hidden border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-4 group ${isDragOverWelcome
                        ? 'border-accent bg-accent/5 scale-[1.02] shadow-md'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}>
                        {isEditingWelcome ? (
                          welcomeImage && (welcomeImage.startsWith('data:') || welcomeImage.startsWith('http://') || welcomeImage.startsWith('https://') || welcomeImage.startsWith('/')) ? (
                            <>
                              <img src={welcomeImage} alt="Pratinjau Foto" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setWelcomeImage('')}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600/90 text-white hover:bg-red-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer"
                                title="Hapus Gambar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                              <span className="text-[11px] text-slate-500 font-bold block">Pilih File Foto</span>
                              <span className="text-[9px] text-slate-400 block font-light">Maksimal 2MB (WEBP/PNG/JPG/JPEG)</span>
                            </div>
                          )
                        ) : (
                          welcomeMessage.imageUrl ? (
                            <Image src={welcomeMessage.imageUrl} alt="Foto Kepala Dinas" fill className="object-cover" />
                          ) : (
                            <div className="text-center space-y-2">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                              <span className="text-[11px] text-slate-500 font-bold block">Tidak Ada Foto</span>
                              <span className="text-[9px] text-slate-400 block font-light leading-none">Foto belum diatur</span>
                            </div>
                          )
                        )}
                        {isEditingWelcome && !welcomeImage && (
                          <input
                            type="file"
                            accept="image/webp, image/png, image/jpeg, image/jpg"
                            onChange={handleFileChange}
                            onDragEnter={() => setIsDragOverWelcome(true)}
                            onDragLeave={() => setIsDragOverWelcome(false)}
                            onDrop={() => setIsDragOverWelcome(false)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        )}
                      </div>

                      {isEditingWelcome && (
                        <div className="space-y-1 text-left">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Atau Tautan URL Gambar</label>
                          <input
                            type="text"
                            name="imageUrl"
                            placeholder="https://..."
                            value={welcomeImage.startsWith('data:') ? '' : welcomeImage}
                            onChange={(e) => setWelcomeImage(e.target.value)}
                            disabled={!isEditingWelcome}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right side: Texts form */}
                    <div className="lg:col-span-8 space-y-4 text-left">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono block">Nama Kepala Dinas</label>
                          <input
                            type="text"
                            required
                            name="name"
                            defaultValue={welcomeMessage.name}
                            disabled={!isEditingWelcome}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 font-medium disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/50"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono block">NIP Kepala Dinas</label>
                          <input
                            type="text"
                            name="nip"
                            defaultValue={welcomeMessage.nip}
                            disabled={!isEditingWelcome}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 font-medium disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono block">Isi Teks Sambutan</label>
                        <textarea
                          required
                          rows={8}
                          name="content"
                          defaultValue={welcomeMessage.content}
                          disabled={!isEditingWelcome}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 font-medium font-inter leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/50 whitespace-pre-wrap"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

          </div>

          {/* Footer info in workspace */}
          <footer className="mt-8 border-t border-slate-200 pt-5 pb-2 text-center text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            afz-mawardi © 2026 DISPORAPAR KOTA TEGAL - PANEL INTERNAL ADMINISTRATOR
          </footer>
        </section>
      </main>

      {/* ==========================================
          DYNAMIC FORM MODAL (ADD / EDIT / DELETE)
      ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in font-inter text-slate-700">
          <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="bg-[#051424] px-6 sm:px-8 py-4.5 flex items-center justify-between text-white shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-tight font-sans">
                {modalType === 'delete' ? 'Konfirmasi Hapus' : modalType === 'add' ? `Tambah ${activeTab}` : `Ubah ${activeTab}`}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                  setUploadedImageBase64('');
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-650 text-white/80 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 hover:rotate-90"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 sm:p-8 space-y-5 text-left flex-grow">

              {/* DELETE CONFIRMATION SCREEN */}
              {modalType === 'delete' && (
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-red-50 border border-red-150 rounded-2xl flex items-center justify-center text-red-650 mx-auto">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-extrabold text-slate-900 text-base">Hapus Data Ini?</h4>
                    <p className="text-xs text-slate-500 mt-2 font-inter leading-relaxed max-w-sm mx-auto">
                      Apakah Anda yakin ingin menghapus data dengan judul <span className="font-bold text-[#0E3B66]">{editingItem?.title}</span>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingItem(null);
                      }}
                      className="px-6 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Hapus Permanen
                    </button>
                  </div>
                </div>
              )}

              {/* SLIDE BERANDA / PILAR PROGRAM FORM */}
              {activeTab === 'beranda' && modalType !== 'delete' && (
                berandaSubTab === 'programs' ? (
                  <>
                    {/* No Icon selector since it is automatically resolved */}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Judul Program</label>
                      <input
                        type="text"
                        required
                        name="title"
                        defaultValue={editingItem?.title || ''}
                        placeholder="Masukkan judul program..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Deskripsi</label>
                      <textarea
                        required
                        name="description"
                        rows={3}
                        defaultValue={editingItem?.description || ''}
                        placeholder="Masukkan deskripsi program..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800 resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Poin Program (1 - 3 Poin)</label>
                        {formPoints.length < 3 && (
                          <button
                            type="button"
                            onClick={() => setFormPoints([...formPoints, ''])}
                            className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
                          >
                            <Plus className="w-3 h-3" /> Tambah Poin
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {formPoints.map((point, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              required
                              value={point}
                              onChange={(e) => {
                                const newPoints = [...formPoints];
                                newPoints[idx] = e.target.value;
                                setFormPoints(newPoints);
                              }}
                              placeholder={`Poin ${idx + 1}...`}
                              className="flex-grow px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                            />
                            {formPoints.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newPoints = formPoints.filter((_, pIdx) => pIdx !== idx);
                                  setFormPoints(newPoints);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* No Urutan and Status fields since they are simplified */}
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Judul Banner (Title)</label>
                      <input
                        type="text"
                        required
                        name="title"
                        defaultValue={editingItem?.title || ''}
                        placeholder="Contoh: Gerbang Pesona Maritim & Keindahan Pesisir Tegal"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Teks Tombol CTA</label>
                        <input
                          type="text"
                          required
                          name="cta"
                          defaultValue={editingItem?.cta || ''}
                          placeholder="Contoh: Jelajahi Pariwisata"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Tautan Tombol (href)</label>
                        <input
                          type="text"
                          required
                          name="href"
                          defaultValue={editingItem?.href || ''}
                          placeholder="Contoh: /pariwisata"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Image input: support local file and url link */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Gambar Background Hero</label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Local Upload */}
                        <div className={`p-4 border-2 border-dashed rounded-xl text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 relative ${isDragOverModal
                          ? 'border-accent bg-accent/5 scale-[1.02] shadow-md'
                          : 'border-slate-350 bg-slate-50/50 hover:bg-slate-50'
                          }`}>
                          <Upload className="w-5 h-5 text-slate-400" />
                          <span className="text-[10px] font-extrabold text-[#0E3B66] uppercase tracking-wider font-mono">Unggah Gambar</span>
                          <span className="text-[8px] text-slate-400 block font-light leading-none">Maksimal 2MB (WEBP/PNG/JPG/JPEG)</span>
                          <input
                            type="file"
                            accept="image/webp, image/png, image/jpeg, image/jpg"
                            onChange={handleFileChange}
                            onDragEnter={() => setIsDragOverModal(true)}
                            onDragLeave={() => setIsDragOverModal(false)}
                            onDrop={() => setIsDragOverModal(false)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>

                        {/* URL input */}
                        <div className="space-y-1.5 flex flex-col justify-center">
                          <span className="text-[8.5px] font-bold text-slate-400 font-mono">Atau Masukkan URL Link:</span>
                          <input
                            type="url"
                            name="imageUrl"
                            id="hero-imageUrl-input"
                            defaultValue={editingItem?.image && !editingItem.image.startsWith('data:') ? editingItem.image : ''}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                          />
                        </div>
                      </div>

                      {uploadedImageBase64 && (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden mt-3 border border-slate-100 shadow-xs">
                          <Image src={uploadedImageBase64} alt="Pratinjau Background" fill className="object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedImageBase64('');
                              const inp = document.getElementById('hero-imageUrl-input') as HTMLInputElement;
                              if (inp) inp.value = '';
                            }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600/90 text-white hover:bg-red-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer hover:rotate-90"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )
              )}

              {/* BERITA FORM */}
              {activeTab === 'berita' && modalType !== 'delete' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Judul Berita</label>
                    <input
                      type="text"
                      required
                      name="title"
                      defaultValue={editingItem?.title || ''}
                      placeholder="Masukkan judul berita"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                    />
                  </div>


                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Konten Lengkap Berita</label>
                    <textarea
                      required
                      rows={5}
                      name="content"
                      defaultValue={editingItem?.content || ''}
                      placeholder="Tulis seluruh paragraf berita di sini..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Kategori</label>
                      <select
                        name="category"
                        defaultValue={editingItem?.category || (categoriesStore.news[0] || 'Pariwisata')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800 cursor-pointer"
                      >
                        {categoriesStore.news.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Penulis / Author</label>
                      <input
                        type="text"
                        required
                        name="author"
                        defaultValue={editingItem?.author || 'Humas DISPORAPAR'}
                        placeholder="Nama kontributor"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Tanggal Publikasi</label>
                      <input
                        type="date"
                        required
                        name="date"
                        defaultValue={editingItem ? parseIndonesianDateToYYYYMMDD(editingItem.date) : ''}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                      />
                      {editingItem?.date && (
                        <span className="text-[9px] text-slate-400 font-inter">Nilai saat ini: {editingItem.date}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 pt-6 text-xs font-bold">
                      <input
                        type="checkbox"
                        id="featured"
                        name="featured"
                        defaultChecked={editingItem?.featured || false}
                        className="w-4 h-4 rounded text-accent border-slate-300 focus:ring-accent accent-accent"
                      />
                      <label htmlFor="featured" className="text-slate-600 select-none cursor-pointer">Sematkan sebagai Berita Utama</label>
                    </div>
                  </div>

                  {/* Image input: support local file and url link */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Visual Gambar Berita</label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Local Upload */}
                      <div className={`p-4 border-2 border-dashed rounded-xl text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 relative ${isDragOverModal
                        ? 'border-accent bg-accent/5 scale-[1.02] shadow-md'
                        : 'border-slate-350 bg-slate-50/50 hover:bg-slate-50'
                        }`}>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] font-extrabold text-[#0E3B66] uppercase tracking-wider font-mono">Unggah Berkas</span>
                        <span className="text-[8px] text-slate-400 block font-light leading-none">Maksimal 2MB (WEBP/PNG/JPG/JPEG)</span>
                        <input
                          type="file"
                          accept="image/webp, image/png, image/jpeg, image/jpg"
                          onChange={handleFileChange}
                          onDragEnter={() => setIsDragOverModal(true)}
                          onDragLeave={() => setIsDragOverModal(false)}
                          onDrop={() => setIsDragOverModal(false)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>

                      {/* URL input */}
                      <div className="space-y-1.5 flex flex-col justify-center">
                        <span className="text-[8.5px] font-bold text-slate-400 font-mono">Atau Masukkan URL Link:</span>
                        <input
                          type="url"
                          name="imageUrl"
                          id="news-imageUrl-input"
                          defaultValue={editingItem?.imageUrl && !editingItem.imageUrl.startsWith('data:') ? editingItem.imageUrl : ''}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {uploadedImageBase64 && (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden mt-3 border border-slate-100 shadow-xs">
                        <Image src={uploadedImageBase64} alt="Pratinjau" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedImageBase64('');
                            const inp = document.getElementById('news-imageUrl-input') as HTMLInputElement;
                            if (inp) inp.value = '';
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600/90 text-white hover:bg-red-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer hover:rotate-90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* GALERI FORM */}
              {activeTab === 'galeri' && modalType !== 'delete' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Judul Foto</label>
                    <input
                      type="text"
                      required
                      name="title"
                      defaultValue={editingItem?.title || ''}
                      placeholder="Masukkan deskripsi singkat foto"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Kategori Kegiatan</label>
                    <select
                      name="category"
                      defaultValue={editingItem?.category || (categoriesStore.gallery[0] || 'Pariwisata')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800 cursor-pointer"
                    >
                      {categoriesStore.gallery.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Image input: support local file and url link */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Gambar Galeri</label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Local Upload */}
                      <div className={`p-4 border-2 border-dashed rounded-xl text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 relative ${isDragOverModal
                        ? 'border-accent bg-accent/5 scale-[1.02] shadow-md'
                        : 'border-slate-350 bg-slate-50/50 hover:bg-slate-50'
                        }`}>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] font-extrabold text-[#0E3B66] uppercase tracking-wider font-mono">Unggah Berkas</span>
                        <span className="text-[8px] text-slate-400 block font-light leading-none">Maksimal 2MB (WEBP/PNG/JPG/JPEG)</span>
                        <input
                          type="file"
                          accept="image/webp, image/png, image/jpeg, image/jpg"
                          onChange={handleFileChange}
                          onDragEnter={() => setIsDragOverModal(true)}
                          onDragLeave={() => setIsDragOverModal(false)}
                          onDrop={() => setIsDragOverModal(false)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>

                      {/* URL input */}
                      <div className="space-y-1.5 flex flex-col justify-center">
                        <span className="text-[8.5px] font-bold text-slate-400 font-mono">Atau Masukkan URL Link:</span>
                        <input
                          type="url"
                          name="imageUrl"
                          id="gallery-imageUrl-input"
                          defaultValue={editingItem?.imageUrl && !editingItem.imageUrl.startsWith('data:') ? editingItem.imageUrl : ''}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {uploadedImageBase64 && (
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden mt-3 border border-slate-100 shadow-xs max-w-[200px] mx-auto">
                        <Image src={uploadedImageBase64} alt="Pratinjau" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedImageBase64('');
                            const inp = document.getElementById('gallery-imageUrl-input') as HTMLInputElement;
                            if (inp) inp.value = '';
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600/90 text-white hover:bg-red-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer hover:rotate-90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* AGENDA FORM */}
              {activeTab === 'agenda' && modalType !== 'delete' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Judul Kegiatan</label>
                    <input
                      type="text"
                      required
                      name="title"
                      defaultValue={editingItem?.title || ''}
                      placeholder="Masukkan nama acara dinas"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Tanggal Acara</label>
                      <input
                        type="date"
                        required
                        name="date"
                        defaultValue={editingItem ? parseIndonesianDateToYYYYMMDD(editingItem.date) : ''}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                      />
                      {editingItem?.date && (
                        <span className="text-[9px] text-slate-400 font-inter">Nilai saat ini: {editingItem.date}</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Waktu (Jam)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          required
                          name="startTime"
                          defaultValue={parseTimeRange(editingItem?.time).start}
                          className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                        <span className="text-slate-400 text-xs font-semibold select-none">s/d</span>
                        <input
                          type="time"
                          required
                          name="endTime"
                          defaultValue={parseTimeRange(editingItem?.time).end}
                          className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                        <span className="text-slate-550 font-bold font-mono text-xs select-none shrink-0">WIB</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Lokasi Penyelenggaraan</label>
                    <input
                      type="text"
                      required
                      name="location"
                      defaultValue={editingItem?.location || ''}
                      placeholder="Nama gedung / lapangan"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                    />
                  </div>

                  {/* Image input: support local file and url link */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Visual Gambar Acara</label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Local Upload */}
                      <div className={`p-4 border-2 border-dashed rounded-xl text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 relative ${isDragOverModal
                        ? 'border-accent bg-accent/5 scale-[1.02] shadow-md'
                        : 'border-slate-350 bg-slate-50/50 hover:bg-slate-50'
                        }`}>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] font-extrabold text-[#0E3B66] uppercase tracking-wider font-mono">Unggah Berkas</span>
                        <span className="text-[8px] text-slate-400 block font-light leading-none">Maksimal 2MB (WEBP/PNG/JPG/JPEG)</span>
                        <input
                          type="file"
                          accept="image/webp, image/png, image/jpeg, image/jpg"
                          onChange={handleFileChange}
                          onDragEnter={() => setIsDragOverModal(true)}
                          onDragLeave={() => setIsDragOverModal(false)}
                          onDrop={() => setIsDragOverModal(false)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>

                      {/* URL input */}
                      <div className="space-y-1.5 flex flex-col justify-center">
                        <span className="text-[8.5px] font-bold text-slate-400 font-mono">Atau Masukkan URL Link:</span>
                        <input
                          type="url"
                          name="imageUrl"
                          id="agenda-imageUrl-input"
                          defaultValue={editingItem?.imageUrl && !editingItem.imageUrl.startsWith('data:') ? editingItem.imageUrl : ''}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {uploadedImageBase64 && (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden mt-3 border border-slate-100 shadow-xs">
                        <Image src={uploadedImageBase64} alt="Pratinjau" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedImageBase64('');
                            const inp = document.getElementById('agenda-imageUrl-input') as HTMLInputElement;
                            if (inp) inp.value = '';
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600/90 text-white hover:bg-red-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer hover:rotate-90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* BERKAS FORM */}
              {activeTab === 'berkas' && modalType !== 'delete' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Nama Berkas / Dokumen</label>
                    <input
                      type="text"
                      required
                      name="title"
                      defaultValue={editingItem?.title || ''}
                      placeholder="Masukkan judul berkas resmi"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Kategori Layanan</label>
                    <select
                      name="category"
                      defaultValue={editingItem?.category || (categoriesStore.services[0] || 'SOP')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800 cursor-pointer"
                    >
                      {categoriesStore.services.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {/* File input: support local file and url link */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Download / Berkas Dokumen</label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Local Upload */}
                      <div className={`p-4 border-2 border-dashed rounded-xl text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 relative ${isDragOverModal
                        ? 'border-accent bg-accent/5 scale-[1.02] shadow-md'
                        : 'border-slate-350 bg-slate-50/50 hover:bg-slate-50'
                        }`}>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] font-extrabold text-[#0E3B66] uppercase tracking-wider font-mono">Unggah Berkas</span>
                        <span className="text-[8px] text-slate-400 block font-light leading-none">Maksimal 5MB (PDF/ZIP/DOC/DOCX)</span>
                        <input
                          type="file"
                          accept=".pdf,.zip,.doc,.docx"
                          onChange={handleDocFileChange}
                          onDragEnter={() => setIsDragOverModal(true)}
                          onDragLeave={() => setIsDragOverModal(false)}
                          onDrop={() => setIsDragOverModal(false)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>

                      {/* URL input */}
                      <div className="space-y-1.5 flex flex-col justify-center">
                        <span className="text-[8.5px] font-bold text-slate-400 font-mono">Atau Masukkan URL Link:</span>
                        <input
                          type="url"
                          name="downloadUrl"
                          id="services-downloadUrl-input"
                          defaultValue={editingItem?.downloadUrl && !editingItem.downloadUrl.startsWith('data:') ? editingItem.downloadUrl : ''}
                          placeholder="https://drive.google.com/..."
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {(uploadedFileBase64 || uploadedFileName) && (
                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-accent shrink-0" />
                          <span className="text-slate-800 font-bold truncate max-w-[200px]">
                            {uploadedFileName || 'Berkas Terunggah'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFileBase64('');
                            setUploadedFileName('');
                            setUploadedFileSize('');
                            const inp = document.getElementById('services-downloadUrl-input') as HTMLInputElement;
                            if (inp) inp.value = '';
                          }}
                          className="text-red-500 hover:text-red-700 font-bold uppercase text-[10px] tracking-wider cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Form Submission Buttons */}
              {modalType !== 'delete' && (
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingItem(null);
                      setUploadedImageBase64('');
                      setUploadedFileBase64('');
                      setUploadedFileName('');
                      setUploadedFileSize('');
                    }}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer font-bold text-xs uppercase tracking-wider font-mono"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-accent hover:bg-orange-500 text-white font-extrabold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-mono text-xs uppercase tracking-wider"
                  >
                    Simpan Data
                  </button>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* ==========================
          CATEGORY MANAGEMENT MODAL
      ========================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in font-inter text-slate-700">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">

            {/* Modal Header */}
            <div className="bg-[#051424] px-6 py-4 flex items-center justify-between text-white shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-tight font-sans">
                Kelola Kategori
              </h3>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                  setEditingCategoryIndex(null);
                  setEditingCategoryName('');
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-650 text-white/80 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 hover:rotate-90"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6 text-left flex-grow">

              {/* Category tabs selection */}
              <div className="flex gap-1 border-b border-slate-200 pb-2.5">
                {[
                  { id: 'news', name: 'Berita' },
                  { id: 'gallery', name: 'Galeri' },
                  { id: 'services', name: 'Berkas' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCategoryManagerTab(tab.id as any);
                      setEditingCategoryIndex(null);
                      setNewCategoryName('');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono transition-colors text-center cursor-pointer ${categoryManagerTab === tab.id
                      ? 'bg-[#0E3B66]/10 text-[#0E3B66]'
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* Category List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Daftar Kategori</span>

                <div className="space-y-1.5 max-h-[35vh] overflow-y-auto pr-1">
                  {categoriesStore[categoryManagerTab]?.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-100 transition-colors">
                      {editingCategoryIndex === idx ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-grow px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryRename(cat, idx)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg uppercase transition-colors cursor-pointer"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryIndex(null)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-350 text-slate-700 text-[10px] font-bold rounded-lg uppercase transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-[#0E3B66]">{cat}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryIndex(idx);
                                setEditingCategoryName(cat);
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#0E3B66] transition-colors cursor-pointer"
                              title="Ubah nama"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-red-650 transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Category form */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Tambah Kategori Baru</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nama kategori baru..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-grow px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-4 py-2 bg-[#0E3B66] hover:bg-sky-900 text-white text-[11px] font-bold uppercase tracking-wider font-mono rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    Tambah
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          ACCOUNT SETTINGS & ADMIN MANAGEMENT MODAL
      ========================================== */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in font-inter text-slate-700">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="bg-[#051424] px-6 py-4.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-accent" />
                <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-tight font-sans">
                  Atur Akun Admin
                </h3>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-650 text-white/80 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 hover:rotate-90"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAccountModalTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${accountModalTab === 'profile'
                  ? 'bg-[#0E3B66] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
                  }`}
              >
                Data Akun
              </button>
              <button
                type="button"
                onClick={() => setAccountModalTab('users')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${accountModalTab === 'users'
                  ? 'bg-[#0E3B66] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
                  }`}
              >
                Manajemen Admin
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6 text-left flex-grow">

              {/* Tab 1: Profile Data */}
              {accountModalTab === 'profile' && (
                <form onSubmit={handleUpdateAccount} className="space-y-4">
                  {accountError && (
                    <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{accountError}</span>
                    </div>
                  )}
                  {accountSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{accountSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Username Saat Ini</label>
                    <input
                      type="text"
                      disabled
                      value={currentAdminUsername}
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-400 cursor-not-allowed select-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Username Baru</label>
                    <input
                      type="text"
                      required
                      name="newUsername"
                      defaultValue={currentAdminUsername}
                      placeholder="Masukkan username baru"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Password Baru (Kosongkan jika tidak diubah)</label>
                    <div className="relative">
                      <input
                        type={showAccountPassword ? "text" : "password"}
                        name="newPassword"
                        placeholder="Masukkan password baru..."
                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccountPassword(!showAccountPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                      >
                        {showAccountPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Konfirmasi Password Baru</label>
                    <input
                      type={showAccountPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Ulangi password baru..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-accent hover:bg-orange-500 text-white font-extrabold rounded-xl transition-all shadow-md active:scale-98 font-mono text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Perbarui Akun
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Admin Management */}
              {accountModalTab === 'users' && (
                <div className="space-y-6">

                  {/* Admin List */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Daftar Admin Aktif</span>

                    <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                      {adminUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-100 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0E3B66] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              {user.username[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#0E3B66]">{user.username}</span>
                              {user.username === currentAdminUsername && (
                                <span className="ml-2 bg-blue-50 text-[#0E3B66] border border-blue-150 text-[8px] font-extrabold px-1.5 py-0.5 rounded font-mono uppercase">Anda</span>
                              )}
                            </div>
                          </div>
                          {user.username !== currentAdminUsername && adminUsers.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(user.id, user.username)}
                              className="p-2 bg-red-50 hover:bg-red-650 hover:text-white border border-red-200 rounded-xl text-red-650 transition-colors cursor-pointer"
                              title="Hapus Admin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-mono italic select-none">Terkunci</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Admin Form */}
                  <div className="pt-4 border-t border-slate-150 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Tambah Akun Admin Baru</span>

                    <form onSubmit={handleCreateAdmin} className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      {newAdminError && (
                        <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-red-800 text-[11px] font-semibold flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          <span>{newAdminError}</span>
                        </div>
                      )}
                      {newAdminSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-emerald-850 text-[11px] font-semibold flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span>{newAdminSuccess}</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider font-mono">Username</label>
                        <input
                          type="text"
                          required
                          value={newAdminUsername}
                          onChange={(e) => setNewAdminUsername(e.target.value)}
                          placeholder="Masukkan username admin baru"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider font-mono">Password</label>
                        <div className="relative">
                          <input
                            type={showNewAdminPassword ? "text" : "password"}
                            required
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent font-medium text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-850 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                          >
                            {showNewAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          type="submit"
                          className="w-full py-3 bg-[#0E3B66] hover:bg-[#08233D] text-white font-extrabold rounded-xl transition-all shadow-xs active:scale-98 font-mono text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Tambah Admin Baru
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
