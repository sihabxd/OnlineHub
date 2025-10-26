// ==================== PROFESSIONAL CONFIGURATION ====================
const CONFIG = {
    AIRTABLE: {
        BASE_ID: 'appFZTp4rpbWSdLVO',
        TABLE_NAME: 'Videos',
        API_URL: 'https://api.airtable.com/v0'
    },
    SEARCH: {
        DEBOUNCE_DELAY: 300,
        MIN_SEARCH_LENGTH: 2,
        MAX_SUGGESTIONS: 8,
        SEARCH_FIELDS: ['title', 'description', 'type', 'tags', 'category'],
        CACHE_DURATION: 5 * 60 * 1000,
        FUZZY_SEARCH: true
    },
    STORAGE: {
        ALL_VIDEOS_KEY: 'videoPlayer_allVideos',
        CURRENT_VIDEO_KEY: 'videoPlayer_currentVideo',
        FILTER_STATE_KEY: 'videoPlayer_filterState',
        RECENTLY_PLAYED_KEY: 'videoPlayer_recentlyPlayed'
    }
};

// ==================== ENHANCED UNIVERSAL VIDEO URL PARSER ====================
class UniversalVideoParser {
    static parseURL(url) {
        if (!url) return null;
        
        // Try each platform parser in order
        const parsers = [
            this.parseYouTube,
            this.parseGoogleDrive,
            this.parseVimeo,
            this.parseDailymotion,
            this.parseFacebook,
            this.parseInstagram,
            this.parseTikTok,
            this.parseTwitter,
            this.parseTwitch,
            this.parseStreamable,
            this.parseDropbox,
            this.parseGooglePhotos,
            this.parseDirectVideo
        ];
        
        for (const parser of parsers) {
            const result = parser(url);
            if (result) {
                return {
                    ...result,
                    originalUrl: url
                };
            }
        }
        
        // Fallback for unknown URLs
        return this.parseUnknown(url);
    }

    static parseYouTube(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&?\/#]+)/,
            /youtube\.com\/playlist\?list=([^&?\/#]+)/,
            /music\.youtube\.com\/watch\?v=([^&?\/#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                const videoId = match[1];
                
                // Handle playlists
                if (url.includes('playlist')) {
                    return {
                        videoId: `playlist-${videoId}`,
                        type: 'youtube_playlist',
                        embedUrls: [
                            `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1&modestbranding=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`,
                            `https://www.youtube-nocookie.com/embed/videoseries?list=${videoId}&autoplay=1&modestbranding=1&rel=0&playsinline=1`,
                            `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1&origin=*`
                        ],
                        thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgMTAwIDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzAiIGZpbGw9IiNmMTBhMGIiLz48dGV4dCB4PSI1MCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPllvdVR1YmUgUGxheWxpc3Q8L3RleHQ+PC9zdmc+',
                        title: 'YouTube Playlist',
                        description: 'YouTube Playlist'
                    };
                } else {
                    // Regular YouTube videos with multiple fallback options
                    const embedUrls = [
                        `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`,
                        `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`,
                        `https://www.youtube.com/embed/${videoId}?autoplay=1&origin=*`,
                        `https://yewtu.be/embed/${videoId}?autoplay=1`,
                        `https://invidious.snopyta.org/embed/${videoId}?autoplay=1`
                    ];
                    return {
                        videoId: videoId,
                        type: 'youtube',
                        embedUrls: embedUrls,
                        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                        title: 'YouTube Video',
                        description: 'YouTube Video'
                    };
                }
            }
        }
        return null;
    }

    static parseGoogleDrive(url) {
        const patterns = [
            /drive\.google\.com\/file\/d\/([^\/]+)/,
            /drive\.google\.com\/open\?id=([^&]+)/,
            /drive\.google\.com\/uc\?id=([^&]+)/,
            /drive\.google\.com\/uc\?export=download&id=([^&]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                const fileId = match[1];
                return {
                    videoId: fileId,
                    type: 'drive',
                    embedUrls: [
                        `https://drive.google.com/file/d/${fileId}/preview`,
                        `https://drive.google.com/file/d/${fileId}/view`
                    ],
                    thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
                    title: 'Google Drive Video',
                    description: 'Google Drive Video'
                };
            }
        }
        return null;
    }

    static parseVimeo(url) {
        const patterns = [
            /vimeo\.com\/(\d+)/,
            /player\.vimeo\.com\/video\/(\d+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                const videoId = match[1];
                return {
                    videoId: videoId,
                    type: 'vimeo',
                    embedUrls: [
                        `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`,
                        `https://vimeo.com/${videoId}`
                    ],
                    thumbnail: `https://vumbnail.com/${videoId}.jpg`,
                    title: 'Vimeo Video',
                    description: 'Vimeo Video'
                };
            }
        }
        return null;
    }

    static parseDailymotion(url) {
        const patterns = [
            /dailymotion\.com\/video\/([^_]+)/,
            /dailymotion\.com\/embed\/video\/([^?]+)/,
            /dai\.ly\/([^?]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                const videoId = match[1];
                return {
                    videoId: videoId,
                    type: 'dailymotion',
                    embedUrls: [
                        `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1`,
                        `https://dailymotion.com/embed/video/${videoId}`
                    ],
                    thumbnail: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
                    title: 'Dailymotion Video',
                    description: 'Dailymotion Video'
                };
            }
        }
        return null;
    }

    static parseFacebook(url) {
        if (url.includes('facebook.com') || url.includes('fb.watch')) {
            const encodedUrl = encodeURIComponent(url);
            return {
                videoId: btoa(url).replace(/=/g, ''),
                type: 'facebook',
                embedUrls: [
                    `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&autoplay=1&width=500`,
                    `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&autoplay=1`
                ],
                thumbnail: '',
                title: 'Facebook Video',
                description: 'Facebook Video'
            };
        }
        return null;
    }

    static parseInstagram(url) {
        const patterns = [
            /instagram\.com\/(?:p|reel|tv)\/([^\/?]+)/,
            /instagram\.com\/p\/([^\/?]+)\/embed/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                const code = match[1];
                return {
                    videoId: code,
                    type: 'instagram',
                    embedUrls: [
                        `https://www.instagram.com/p/${code}/embed/`,
                        `https://www.instagram.com/reel/${code}/embed/`,
                        `https://www.instagram.com/tv/${code}/embed/`
                    ],
                    thumbnail: '',
                    title: 'Instagram Video',
                    description: 'Instagram Video'
                };
            }
        }
        return null;
    }

    static parseTikTok(url) {
        if (url.includes('tiktok.com')) {
            const videoId = url.split('/').pop().split('?')[0];
            return {
                videoId: videoId,
                type: 'tiktok',
                embedUrls: [
                    `https://www.tiktok.com/embed/v2/${videoId}`,
                    `https://www.tiktok.com/embed/${videoId}`
                ],
                thumbnail: '',
                title: 'TikTok Video',
                description: 'TikTok Video'
            };
        }
        return null;
    }

    static parseTwitter(url) {
        if (url.includes('twitter.com') || url.includes('x.com')) {
            const encodedUrl = encodeURIComponent(url);
            return {
                videoId: btoa(url).replace(/=/g, ''),
                type: 'twitter',
                embedUrls: [
                    `https://twitframe.com/show?url=${encodedUrl}`,
                    `https://platform.twitter.com/embed/Tweet.html?url=${encodedUrl}`
                ],
                thumbnail: '',
                title: 'Twitter/X Video',
                description: 'Twitter/X Video'
            };
        }
        return null;
    }

    static parseTwitch(url) {
        const videoPattern = /twitch\.tv\/videos\/(\d+)/;
        const clipPattern = /twitch\.tv\/(?:\w+)\/clip\/([^?]+)/;
        
        const videoMatch = url.match(videoPattern);
        if (videoMatch) {
            return {
                videoId: videoMatch[1],
                type: 'twitch',
                embedUrls: [
                    `https://player.twitch.tv/?video=${videoMatch[1]}&parent=${window.location.hostname}&autoplay=true`,
                    `https://player.twitch.tv/?video=${videoMatch[1]}&parent=localhost&autoplay=true`
                ],
                thumbnail: '',
                title: 'Twitch Video',
                description: 'Twitch Video'
            };
        }
        
        const clipMatch = url.match(clipPattern);
        if (clipMatch) {
            return {
                videoId: clipMatch[1],
                type: 'twitch',
                embedUrls: [
                    `https://clips.twitch.tv/embed?clip=${clipMatch[1]}&parent=${window.location.hostname}&autoplay=true`,
                    `https://clips.twitch.tv/embed?clip=${clipMatch[1]}&parent=localhost&autoplay=true`
                ],
                thumbnail: '',
                title: 'Twitch Clip',
                description: 'Twitch Clip'
            };
        }
        
        return null;
    }

    static parseStreamable(url) {
        const pattern = /streamable\.com\/([^?]+)/;
        const match = url.match(pattern);
        if (match) {
            return {
                videoId: match[1],
                type: 'streamable',
                embedUrls: [
                    `https://streamable.com/e/${match[1]}?autoplay=1`,
                    `https://streamable.com/o/${match[1]}`
                ],
                thumbnail: '',
                title: 'Streamable Video',
                description: 'Streamable Video'
            };
        }
        return null;
    }

    static parseDropbox(url) {
        const pattern = /dropbox\.com\/s\/([^\/]+)\/([^?]+)/;
        const match = url.match(pattern);
        if (match) {
            return {
                videoId: match[1],
                type: 'dropbox',
                embedUrls: [
                    `https://www.dropbox.com/s/${match[1]}/${match[2]}?raw=1`,
                    `https://dl.dropboxusercontent.com/s/${match[1]}/${match[2]}`
                ],
                thumbnail: '',
                title: 'Dropbox Video',
                description: 'Dropbox Video'
            };
        }
        return null;
    }

    static parseGooglePhotos(url) {
        if (url.includes('photos.app.goo.gl') || url.includes('photos.google.com')) {
            return {
                videoId: btoa(url).replace(/=/g, ''),
                type: 'photos',
                embedUrls: [url],
                thumbnail: '',
                title: 'Google Photos',
                description: 'Google Photos'
            };
        }
        return null;
    }

    static parseDirectVideo(url) {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.flv', '.avi'];
        const isVideo = videoExtensions.some(ext => url.toLowerCase().includes(ext));
        
        if (isVideo) {
            return {
                videoId: btoa(url).replace(/=/g, ''),
                type: 'direct',
                embedUrls: [url],
                thumbnail: '',
                title: 'Direct Video',
                description: 'Direct Video File'
            };
        }
        return null;
    }

    static parseUnknown(url) {
        return {
            videoId: btoa(url).replace(/=/g, ''),
            type: 'other',
            embedUrls: [url],
            thumbnail: '',
            title: 'Custom Video',
            description: 'Video from unknown source'
        };
    }
}

// ==================== ENHANCED VIDEO PLAYER CONTROLLER ====================
class EnhancedVideoPlayer {
    constructor(videoManager) {
        this.videoManager = videoManager;
        this.videoContainer = document.querySelector('.video-container');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.currentVideoTitle = document.getElementById('currentVideoTitle');
        this.currentVideoDescription = document.getElementById('currentVideoDescription');
        this.currentPlatformBadge = document.getElementById('currentPlatformBadge');
        this.fallbackMessage = document.getElementById('fallbackMessage');
        this.currentEmbedIndex = 0;
        this.currentVideoData = null;
        this.setupFallbackOptions();
    }

    async loadVideo(video) {
        if (!video) return;

        this.videoManager.loadVideoById(video.id);
        this.fallbackMessage.style.display = 'none';
        this.currentEmbedIndex = 0;
        this.currentVideoData = video;

        // Show loading state
        this.currentVideoTitle.textContent = 'Loading...';
        this.currentVideoDescription.textContent = 'Fetching video information...';

        let embedUrls = video.embedUrls || [video.url || ""];
        let badgeClass = "";
        let badgeText = "";

        // Determine platform and set appropriate badge
        switch (video.type) {
            case "youtube":
                badgeClass = "badge-youtube";
                badgeText = "YouTube";
                break;
            case "youtube_playlist":
                badgeClass = "badge-youtube";
                badgeText = "YouTube Playlist";
                break;
            case "drive":
                badgeClass = "badge-drive";
                badgeText = "Google Drive";
                break;
            case "vimeo":
                badgeClass = "badge-vimeo";
                badgeText = "Vimeo";
                break;
            case "dailymotion":
                badgeClass = "badge-dailymotion";
                badgeText = "Dailymotion";
                break;
            case "facebook":
                badgeClass = "badge-facebook";
                badgeText = "Facebook";
                break;
            case "instagram":
                badgeClass = "badge-instagram";
                badgeText = "Instagram";
                break;
            case "tiktok":
                badgeClass = "badge-tiktok";
                badgeText = "TikTok";
                break;
            case "twitter":
                badgeClass = "badge-twitter";
                badgeText = "Twitter/X";
                break;
            case "twitch":
                badgeClass = "badge-twitch";
                badgeText = "Twitch";
                break;
            case "streamable":
                badgeClass = "badge-streamable";
                badgeText = "Streamable";
                break;
            case "dropbox":
                badgeClass = "badge-dropbox";
                badgeText = "Dropbox";
                break;
            case "photos":
                badgeClass = "badge-photos";
                badgeText = "Google Photos";
                break;
            case "direct":
                // For direct video files, use a video element instead of iframe
                this.loadDirectVideo(video, embedUrls[0]);
                return;
            default:
                badgeClass = "badge-other";
                badgeText = video.type.charAt(0).toUpperCase() + video.type.slice(1);
        }

        // Set up loading timeout and error handling
        const loadingTimeout = setTimeout(() => {
            this.showFallbackMessage(video);
        }, 10000);

        this.videoPlayer.onload = () => {
            clearTimeout(loadingTimeout);
            this.videoPlayer.style.display = 'block';
            this.videoManager.showNotification(`Loaded ${badgeText} video`, 'success');
        };

        this.videoPlayer.onerror = () => {
            clearTimeout(loadingTimeout);
            this.handleEmbedError(video, embedUrls);
        };

        // Load the first embed URL
        this.videoPlayer.src = embedUrls[0];
        this.videoPlayer.style.display = 'block';

        // Update UI with video information
        this.currentVideoTitle.textContent = video.title;
        this.currentVideoDescription.textContent = video.description;
        this.currentPlatformBadge.className = `platform-badge ${badgeClass}`;
        this.currentPlatformBadge.textContent = badgeText;

        this.setupFallbackOptions(video);
    }

    loadDirectVideo(video, url) {
        // Replace iframe with video element for direct video files
        const videoContainer = this.videoPlayer.parentElement;
        
        // Remove existing video elements
        const existingVideo = videoContainer.querySelector('video');
        if (existingVideo) {
            existingVideo.remove();
        }
        
        // Show the iframe again
        this.videoPlayer.style.display = 'none';
        
        // Create video element
        const videoElement = document.createElement('video');
        videoElement.controls = true;
        videoElement.autoplay = true;
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.position = 'absolute';
        videoElement.style.top = '0';
        videoElement.style.left = '0';
        
        const source = document.createElement('source');
        source.src = url;
        source.type = this.getVideoMimeType(url);
        
        videoElement.appendChild(source);
        videoContainer.appendChild(videoElement);
        
        // Update UI
        this.currentVideoTitle.textContent = video.title;
        this.currentVideoDescription.textContent = video.description;
        this.currentPlatformBadge.className = 'platform-badge badge-other';
        this.currentPlatformBadge.textContent = 'Direct Video';
        
        this.videoManager.showNotification('Loaded direct video file', 'success');
    }

    getVideoMimeType(url) {
        const extension = url.split('.').pop().toLowerCase();
        const mimeTypes = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mov': 'video/quicktime',
            'mkv': 'video/x-matroska',
            'flv': 'video/x-flv',
            'avi': 'video/x-msvideo'
        };
        return mimeTypes[extension] || 'video/mp4';
    }

    handleEmbedError(video, embedUrls) {
        this.currentEmbedIndex++;
        
        if (this.currentEmbedIndex < embedUrls.length) {
            // Try next embed URL
            this.videoPlayer.src = embedUrls[this.currentEmbedIndex];
            this.videoManager.showNotification(`Trying alternative embed... (${this.currentEmbedIndex + 1}/${embedUrls.length})`, 'info');
        } else {
            // No more fallbacks, show error message
            this.showFallbackMessage(video);
            this.videoManager.showNotification('Could not load video with any available method', 'error');
        }
    }

    showFallbackMessage(video = null) {
        this.fallbackMessage.style.display = 'flex';
        if (video) {
            this.setupFallbackOptions(video);
        }
    }

    setupFallbackOptions(video = null) {
        const openOriginal = document.getElementById('openOriginal');
        const downloadVideo = document.getElementById('downloadVideo');

        if (video) {
            openOriginal.onclick = () => {
                let url;
                switch (video.type) {
                    case 'drive':
                        url = `https://drive.google.com/file/d/${video.videoId}/view?usp=sharing`;
                        break;
                    case 'youtube_playlist':
                        url = `https://www.youtube.com/playlist?list=${video.videoId}`;
                        break;
                    case 'youtube':
                        url = `https://www.youtube.com/watch?v=${video.videoId}`;
                        break;
                    default:
                        url = video.originalUrl || video.url;
                }
                window.open(url, '_blank');
                this.videoManager.showNotification('Opening original video...', 'success');
            };

            downloadVideo.onclick = () => {
                let url;
                if (video.type === 'drive') {
                    url = `https://drive.google.com/uc?export=download&id=${video.videoId}`;
                } else if (video.type === 'direct') {
                    url = video.url;
                } else {
                    url = video.originalUrl || video.url;
                }
                window.open(url, '_blank');
                this.videoManager.showNotification('Starting download...', 'success');
            };
        }
    }
}

// ==================== ENHANCED VIDEO MANAGER ====================
class EnhancedVideoManager {
    constructor() {
        this.allVideos = [];
        this.filteredVideos = [];
        this.currentVideoId = null;
        this.currentPlatform = 'all';
        this.currentSearchTerm = '';
        this.currentSortOption = 'default';
        this.currentFilters = { platform: 'all' };
        this.recentlyPlayed = [];
        this.isLoading = false;
        
        this.services = {
            airtable: new AirtableService('patPnJxM2TRWXuka0.087c43bbf8e133080578197ef90fbd4ab5aba7dd7b77194e54fc7a98c5707899'),
            metadata: new VideoMetadataService()
        };
        
        this.searchService = new SearchService(this.services.airtable);
        this.cache = new Map();
        this.searchTimeout = null;
    }

    async loadVideos() {
        this.isLoading = true;
        
        try {
            // Try to load from cache first
            const cached = this.loadFromStorage(CONFIG.STORAGE.ALL_VIDEOS_KEY);
            if (cached && cached.length > 0) {
                this.allVideos = cached;
                this.showNotification(`Loaded ${this.allVideos.length} videos from cache`, 'success');
            }

            // Always refresh from Airtable for latest data
            const freshVideos = await this.services.airtable.getAllVideos();
            this.allVideos = freshVideos;
            this.saveToStorage(CONFIG.STORAGE.ALL_VIDEOS_KEY, this.allVideos);
            
            await this.searchService.buildSearchIndex(this.allVideos);
            
            // Restore application state
            this.restoreApplicationState();
            
            this.applyFiltersAndSearch();
            
            if (freshVideos.length > 0) {
                this.showNotification(`Synced ${freshVideos.length} videos from cloud`, 'success');
            }
            
            return this.allVideos;
        } catch (error) {
            console.error('Error loading videos:', error);
            this.showNotification('Failed to load videos: ' + error.message, 'error');
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    applyFiltersAndSearch() {
        let results = [...this.allVideos];

        // Apply platform filter
        if (this.currentFilters.platform && this.currentFilters.platform !== 'all') {
            results = results.filter(video => video.type === this.currentFilters.platform);
        }

        // Apply search
        if (this.currentSearchTerm && this.currentSearchTerm.length >= CONFIG.SEARCH.MIN_SEARCH_LENGTH) {
            results = this.searchVideos(results, this.currentSearchTerm);
        }

        // Apply sorting
        this.filteredVideos = this.sortVideos(results, this.currentSortOption);

        this.updateUI();
    }

    searchVideos(videos, searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return videos.filter(video => {
            return CONFIG.SEARCH.SEARCH_FIELDS.some(field => {
                const fieldValue = String(video[field] || '').toLowerCase();
                return CONFIG.SEARCH.FUZZY_SEARCH 
                    ? this.fuzzyMatch(fieldValue, searchLower)
                    : fieldValue.includes(searchLower);
            });
        });
    }

    fuzzyMatch(text, search) {
        let searchIndex = 0;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === search[searchIndex]) {
                searchIndex++;
            }
            if (searchIndex === search.length) return true;
        }
        return false;
    }

    sortVideos(videos, sortOption) {
        const sorted = [...videos];
        
        switch (sortOption) {
            case 'title_asc':
                sorted.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'title_desc':
                sorted.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'date_desc':
                sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'date_asc':
                sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'duration_asc':
                sorted.sort((a, b) => this.parseDuration(a.duration) - this.parseDuration(b.duration));
                break;
            case 'duration_desc':
                sorted.sort((a, b) => this.parseDuration(b.duration) - this.parseDuration(a.duration));
                break;
            case 'popularity':
                sorted.sort((a, b) => {
                    const aScore = this.calculatePopularityScore(a);
                    const bScore = this.calculatePopularityScore(b);
                    return bScore - aScore;
                });
                break;
            case 'recently_played':
                sorted.sort((a, b) => {
                    const aPlayed = this.recentlyPlayed.find(v => v.id === a.id);
                    const bPlayed = this.recentlyPlayed.find(v => v.id === b.id);
                    if (!aPlayed && !bPlayed) return 0;
                    if (!aPlayed) return 1;
                    if (!bPlayed) return -1;
                    return new Date(bPlayed.playedAt) - new Date(aPlayed.playedAt);
                });
                break;
        }
        
        return sorted;
    }

    loadVideoById(videoId) {
        const videoIndex = this.filteredVideos.findIndex(v => v.id === videoId);
        if (videoIndex !== -1) {
            this.currentVideoId = videoId;
            this.saveToStorage(CONFIG.STORAGE.CURRENT_VIDEO_KEY, videoId);
            this.addToRecentlyPlayed(videoId);
            this.updateUI();
            return this.filteredVideos[videoIndex];
        }
        return null;
    }

    nextVideo() {
        if (this.filteredVideos.length === 0) return null;
        
        const currentIndex = this.filteredVideos.findIndex(v => v.id === this.currentVideoId);
        let nextIndex = currentIndex + 1;
        
        if (nextIndex >= this.filteredVideos.length) {
            nextIndex = 0; // Loop to beginning
        }
        
        return this.loadVideoById(this.filteredVideos[nextIndex].id);
    }

    prevVideo() {
        if (this.filteredVideos.length === 0) return null;
        
        const currentIndex = this.filteredVideos.findIndex(v => v.id === this.currentVideoId);
        let prevIndex = currentIndex - 1;
        
        if (prevIndex < 0) {
            prevIndex = this.filteredVideos.length - 1; // Loop to end
        }
        
        return this.loadVideoById(this.filteredVideos[prevIndex].id);
    }

    addToRecentlyPlayed(videoId) {
        const existingIndex = this.recentlyPlayed.findIndex(v => v.id === videoId);
        
        if (existingIndex !== -1) {
            this.recentlyPlayed.splice(existingIndex, 1);
        }
        
        this.recentlyPlayed.unshift({
            id: videoId,
            playedAt: new Date().toISOString(),
            playCount: (this.getRecentlyPlayedData(videoId)?.playCount || 0) + 1
        });
        
        // Keep only last 50 entries
        this.recentlyPlayed = this.recentlyPlayed.slice(0, 50);
        this.saveToStorage(CONFIG.STORAGE.RECENTLY_PLAYED_KEY, this.recentlyPlayed);
    }

    getRecentlyPlayedData(videoId) {
        return this.recentlyPlayed.find(v => v.id === videoId);
    }

    calculatePopularityScore(video) {
        const playedData = this.getRecentlyPlayedData(video.id);
        const playCount = playedData?.playCount || 0;
        const viewCount = video.viewCount || 0;
        return viewCount + (playCount * 10);
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from storage:', error);
            return null;
        }
    }

    restoreApplicationState() {
        // Restore current video
        const savedVideoId = this.loadFromStorage(CONFIG.STORAGE.CURRENT_VIDEO_KEY);
        if (savedVideoId && this.allVideos.some(v => v.id === savedVideoId)) {
            this.currentVideoId = savedVideoId;
        }

        // Restore recently played
        this.recentlyPlayed = this.loadFromStorage(CONFIG.STORAGE.RECENTLY_PLAYED_KEY) || [];

        // Restore filter state
        const savedState = this.loadFromStorage(CONFIG.STORAGE.FILTER_STATE_KEY);
        if (savedState) {
            this.currentPlatform = savedState.platform || 'all';
            this.currentSearchTerm = savedState.searchTerm || '';
            this.currentSortOption = savedState.sortOption || 'default';
            this.currentFilters.platform = this.currentPlatform;
        }
    }

    saveFilterState() {
        const state = {
            platform: this.currentPlatform,
            searchTerm: this.currentSearchTerm,
            sortOption: this.currentSortOption
        };
        this.saveToStorage(CONFIG.STORAGE.FILTER_STATE_KEY, state);
    }

    updateUI() {
        this.updateVideoCount();
        this.renderPlaylist();
        this.updateNavigationButtons();
        this.updateActiveVideoHighlight();
        this.saveFilterState();
    }

    updateVideoCount() {
        const countElement = document.getElementById('videoCount');
        if (countElement) {
            countElement.textContent = `${this.filteredVideos.length} video${this.filteredVideos.length !== 1 ? 's' : ''}`;
        }
    }

    renderPlaylist() {
        const videoList = document.getElementById('videoList');
        if (!videoList) return;

        if (this.filteredVideos.length === 0) {
            videoList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        videoList.innerHTML = this.filteredVideos.map((video, index) => 
            this.createVideoItemHTML(video, index)
        ).join('');
    }

    createVideoItemHTML(video, index) {
        const isActive = video.id === this.currentVideoId;
        const recentlyPlayed = this.getRecentlyPlayedData(video.id);
        const popularityScore = this.calculatePopularityScore(video);
        
        return `
            <div class="video-item ${video.type} ${isActive ? 'active' : ''}" 
                 data-video-id="${video.id}" data-index="${index}">
                <img class="video-thumb" src="${this.getThumbnailUrl(video)}" 
                     alt="${video.title}" loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgMTAwIDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzAiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNMzUgMzBMNTAgNDVINjVMMzUiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+'">
                <div class="video-item-info">
                    <div class="video-item-title">${this.highlightSearchTerms(video.title)}</div>
                    <div class="video-item-meta">
                        <span class="video-duration">${video.duration || '--:--'}</span>
                        <span>${video.type.charAt(0).toUpperCase() + video.type.slice(1)}</span>
                        ${recentlyPlayed ? '<span class="recent-badge" title="Recently played"><i class="fas fa-history"></i></span>' : ''}
                        ${popularityScore > 10 ? '<span class="popularity-badge" title="Popular video"><i class="fas fa-fire"></i></span>' : ''}
                        ${isActive ? '<span class="currently-playing-badge"><i class="fas fa-play"></i> Playing</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        let message = 'No videos available';
        let description = 'Try adjusting your search or filters';

        if (this.currentSearchTerm) {
            message = 'No videos found';
            description = `No results for "${this.currentSearchTerm}"`;
        } else if (this.currentFilters.platform !== 'all') {
            message = `No ${this.currentFilters.platform} videos`;
            description = 'Try a different platform filter';
        }

        return `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>${message}</h3>
                <p>${description}</p>
            </div>
        `;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (!prevBtn || !nextBtn) return;

        const hasVideos = this.filteredVideos.length > 0;
        const currentIndex = this.filteredVideos.findIndex(v => v.id === this.currentVideoId);
        const hasSelection = currentIndex !== -1;

        prevBtn.disabled = !hasVideos || !hasSelection || currentIndex === 0;
        nextBtn.disabled = !hasVideos || !hasSelection || currentIndex === this.filteredVideos.length - 1;
    }

    updateActiveVideoHighlight() {
        document.querySelectorAll('.video-item').forEach(item => {
            const videoId = item.dataset.videoId;
            item.classList.toggle('active', videoId === this.currentVideoId);
        });
    }

    getThumbnailUrl(video) {
        if (video.thumbnail) return video.thumbnail;
        
        if (video.type.includes('youtube')) {
            return video.type === 'youtube_playlist' 
                ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgMTAwIDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzAiIGZpbGw9IiNmMTBhMGIiLz48dGV4dCB4PSI1MCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPllvdVR1YmUgUGxheWxpc3Q8L3RleHQ+PC9zdmc+'
                : `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
        } else if (video.type === 'drive') {
            return `https://drive.google.com/thumbnail?id=${video.videoId}&sz=w400`;
        }
        
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgMTAwIDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzAiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNMzUgMzBMNTAgNDVINjVMMzUiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
    }

    highlightSearchTerms(text) {
        if (!this.currentSearchTerm || !text) return text;
        const regex = new RegExp(`(${this.currentSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    parseDuration(duration) {
        if (!duration || duration === '--:--') return 0;
        const parts = duration.split(':');
        if (parts.length === 3) {
            return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        } else if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return 0;
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (!notification || !notificationText) return;

        notificationText.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    async addCustomVideo(url) {
        if (!url) {
            this.showNotification('Please enter a video URL', 'warning');
            return null;
        }

        try {
            const parsed = UniversalVideoParser.parseURL(url);
            if (!parsed) {
                throw new Error('Unsupported video URL format');
            }

            let videoData = {
                id: parsed.videoId,
                title: parsed.title,
                description: parsed.description,
                type: parsed.type,
                duration: '--:--',
                url: parsed.embedUrls[0],
                embedUrls: parsed.embedUrls,
                thumbnail: parsed.thumbnail,
                originalUrl: parsed.originalUrl
            };

            const createdVideo = await this.services.airtable.addVideo(videoData);
            
            // Update local state
            this.allVideos.push(createdVideo);
            await this.searchService.buildSearchIndex(this.allVideos);
            this.saveToStorage(CONFIG.STORAGE.ALL_VIDEOS_KEY, this.allVideos);
            
            // Refresh view
            this.applyFiltersAndSearch();
            
            this.showNotification('Video added successfully!', 'success');
            return createdVideo;
            
        } catch (error) {
            console.error('Error adding video:', error);
            this.showNotification('Failed to add video: ' + error.message, 'error');
            return null;
        }
    }
}

// ==================== SUPPORTING SERVICES ====================
class AirtableService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = `${CONFIG.AIRTABLE.API_URL}/${CONFIG.AIRTABLE.BASE_ID}/${CONFIG.AIRTABLE.TABLE_NAME}`;
        this.headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
        this.retryCount = 3;
        this.retryDelay = 1000;
        this.cache = new Map();
    }

    async handleRequest(url, options, retries = this.retryCount) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 429 && retries > 0) {
                    await this.delay(this.retryDelay);
                    return this.handleRequest(url, options, retries - 1);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            if (retries > 0) {
                await this.delay(this.retryDelay);
                return this.handleRequest(url, options, retries - 1);
            }
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getAllVideos() {
        try {
            const data = await this.handleRequest(this.baseUrl, {
                method: 'GET',
                headers: this.headers
            });

            if (!data.records || !Array.isArray(data.records)) {
                throw new Error('Invalid Airtable response format');
            }

            const videos = data.records.map(record => ({
                id: record.id,
                videoId: record.fields.videoId || record.id,
                title: record.fields.title || '',
                description: record.fields.description || '',
                type: record.fields.type || 'other',
                duration: record.fields.duration || '--:--',
                url: record.fields.url || '',
                embedUrls: record.fields.embedUrls || [record.fields.url || ''],
                thumbnail: record.fields.thumbnail || null,
                createdAt: record.fields.createdAt || new Date().toISOString(),
                status: record.fields.status || 'active',
                viewCount: record.fields.viewCount || 0,
                tags: record.fields.tags || [],
                category: record.fields.category || 'general',
                author: record.fields.author || ''
            })).filter(video => video.status !== 'inactive');

            return videos;
        } catch (error) {
            console.error('Error fetching videos from Airtable:', error);
            throw new Error('Failed to load videos from cloud storage');
        }
    }

    async addVideo(video) {
        try {
            const record = {
                fields: {
                    videoId: video.id,
                    title: video.title,
                    description: video.description,
                    type: video.type,
                    duration: video.duration || '--:--',
                    url: video.url,
                    //embedUrls: video.embedUrls || [video.url],
                    thumbnail: video.thumbnail || '',
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    viewCount: video.viewCount || 0,
                    tags: video.tags || [],
                    category: video.category || 'general',
                    author: video.author || ''
                }
            };

            const data = await this.handleRequest(this.baseUrl, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ records: [record] })
            });

            if (!data.records || data.records.length === 0) {
                throw new Error('No record returned from Airtable');
            }

            this.clearCache();
            const createdRecord = data.records[0];
            return {
                id: createdRecord.id,
                videoId: createdRecord.fields.videoId,
                title: createdRecord.fields.title,
                description: createdRecord.fields.description,
                type: createdRecord.fields.type,
                duration: createdRecord.fields.duration,
                url: createdRecord.fields.url,
                embedUrls: createdRecord.fields.embedUrls || [createdRecord.fields.url],
                thumbnail: createdRecord.fields.thumbnail,
                createdAt: createdRecord.fields.createdAt,
                status: createdRecord.fields.status,
                viewCount: createdRecord.fields.viewCount || 0,
                tags: createdRecord.fields.tags || [],
                category: createdRecord.fields.category || 'general',
                author: createdRecord.fields.author || ''
            };
        } catch (error) {
            console.error('Error adding video to Airtable:', error);
            throw error;
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

class VideoMetadataService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000;
    }

    async fetchMetadata(videoData) {
        // Basic implementation - can be extended for specific platforms
        return {
            title: videoData.title,
            author: '',
            duration: '',
            thumbnail: videoData.thumbnail,
            description: videoData.description,
            publishDate: ''
        };
    }
}

class SearchService {
    constructor(airtableService) {
        this.airtableService = airtableService;
        this.searchIndex = new Map();
        this.suggestionCache = new Map();
    }

    async buildSearchIndex(videos) {
        this.searchIndex.clear();
        videos.forEach(video => {
            const titleWords = this.tokenize(video.title);
            titleWords.forEach(word => {
                if (!this.searchIndex.has(word)) this.searchIndex.set(word, new Set());
                this.searchIndex.get(word).add(video.id);
            });
            if (!this.searchIndex.has(video.type)) this.searchIndex.set(video.type, new Set());
            this.searchIndex.get(video.type).add(video.id);
        });
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    getSuggestions(query, videos, maxResults = CONFIG.SEARCH.MAX_SUGGESTIONS) {
        if (query.length < CONFIG.SEARCH.MIN_SEARCH_LENGTH) return [];
        const cacheKey = `suggestions-${query}`;
        if (this.suggestionCache.has(cacheKey)) return this.suggestionCache.get(cacheKey);

        const suggestions = [];
        const queryLower = query.toLowerCase();

        videos.forEach(video => {
            if (video.title.toLowerCase().includes(queryLower)) {
                suggestions.push({ type: 'title', text: video.title, video: video });
            }
        });

        const platforms = ['youtube', 'drive', 'vimeo', 'dailymotion', 'facebook', 'instagram', 'tiktok', 'twitter', 'twitch', 'streamable', 'dropbox', 'photos'];
        platforms.forEach(platform => {
            if (platform.includes(queryLower)) {
                suggestions.push({ type: 'platform', text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Videos`, platform: platform });
            }
        });

        const limitedSuggestions = suggestions.slice(0, maxResults);
        this.suggestionCache.set(cacheKey, limitedSuggestions);
        return limitedSuggestions;
    }

    clearSuggestionCache() {
        this.suggestionCache.clear();
    }
}

// ==================== APPLICATION INITIALIZATION ====================
let videoManager;
let videoPlayerController;

function createFloatingParticles() {
    const particlesContainer = document.getElementById('floatingParticles');
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 120 + 30;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const delay = Math.random() * 15;
        const duration = Math.random() * 12 + 18;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}%`;
        particle.style.top = `${top}%`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        particlesContainer.appendChild(particle);
    }
}

function setupEventListeners() {
    const videoSearch = document.getElementById('videoSearch');
    const sortOptions = document.getElementById('sortOptions');
    const filterOptions = document.getElementById('filterOptions');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const clearAllFilters = document.getElementById('clearAllFilters');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const addCustomVideoBtn = document.getElementById('addCustomVideo');
    const customVideoUrl = document.getElementById('customVideoUrl');
    const platformTabs = document.querySelectorAll('.platform-tab');
    const videoList = document.getElementById('videoList');

    // Search with debouncing
    let searchTimeout;
    videoSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value;
        searchTimeout = setTimeout(() => {
            videoManager.currentSearchTerm = query;
            videoManager.applyFiltersAndSearch();
            videoManager.showNotification(`Searching for "${query}"`, 'info');
        }, CONFIG.SEARCH.DEBOUNCE_DELAY);
    });

    // Sort and filter changes
    sortOptions.addEventListener('change', (e) => {
        videoManager.currentSortOption = e.target.value;
        videoManager.applyFiltersAndSearch();
        videoManager.showNotification(`Sorted by: ${e.target.options[e.target.selectedIndex].text}`, 'success');
    });

    filterOptions.addEventListener('change', (e) => {
        videoManager.currentFilters.platform = e.target.value;
        videoManager.currentPlatform = e.target.value;
        videoManager.applyFiltersAndSearch();
        videoManager.showNotification(`Filtered by: ${e.target.value}`, 'success');
    });

    // Platform tabs
    platformTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.platform-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const platform = tab.dataset.platform;
            
            videoManager.currentPlatform = platform;
            videoManager.currentFilters.platform = platform;
            filterOptions.value = platform;
            
            videoManager.applyFiltersAndSearch();
            videoManager.showNotification(`Showing ${platform} videos`, 'success');
        });
    });

    // Clear actions
    clearSearchBtn.addEventListener('click', () => {
        videoSearch.value = '';
        videoManager.currentSearchTerm = '';
        videoManager.applyFiltersAndSearch();
        videoManager.showNotification('Search cleared', 'info');
    });

    clearAllFilters.addEventListener('click', () => {
        videoSearch.value = '';
        videoManager.currentSearchTerm = '';
        filterOptions.value = 'all';
        videoManager.currentFilters.platform = 'all';
        videoManager.currentPlatform = 'all';
        sortOptions.value = 'default';
        videoManager.currentSortOption = 'default';
        
        document.querySelectorAll('.platform-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.platform-tab[data-platform="all"]').classList.add('active');
        
        videoManager.applyFiltersAndSearch();
        videoManager.showNotification('All filters cleared', 'success');
    });

    // Navigation
    prevBtn.addEventListener('click', () => {
        const video = videoManager.prevVideo();
        if (video) {
            videoPlayerController.loadVideo(video);
            videoManager.showNotification(`Now playing: ${video.title}`, 'success');
        }
    });

    nextBtn.addEventListener('click', () => {
        const video = videoManager.nextVideo();
        if (video) {
            videoPlayerController.loadVideo(video);
            videoManager.showNotification(`Now playing: ${video.title}`, 'success');
        }
    });

    // Add custom video
    addCustomVideoBtn.addEventListener('click', async () => {
        const url = customVideoUrl.value.trim();
        if (!url) {
            videoManager.showNotification('Please enter a video URL', 'warning');
            return;
        }

        const originalButtonText = addCustomVideoBtn.innerHTML;
        addCustomVideoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        addCustomVideoBtn.disabled = true;

        try {
            const video = await videoManager.addCustomVideo(url);
            if (video) {
                customVideoUrl.value = '';
                // Optionally load the new video
                videoPlayerController.loadVideo(video);
            }
        } finally {
            addCustomVideoBtn.innerHTML = originalButtonText;
            addCustomVideoBtn.disabled = false;
        }
    });

    customVideoUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCustomVideoBtn.click();
        }
    });

    // Video list click delegation
    videoList.addEventListener('click', (e) => {
        const videoItem = e.target.closest('.video-item');
        if (videoItem) {
            const videoId = videoItem.dataset.videoId;
            const video = videoManager.filteredVideos.find(v => v.id === videoId);
            if (video) {
                videoPlayerController.loadVideo(video);
                videoManager.showNotification(`Now playing: ${video.title}`, 'success');
            }
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            videoSearch.focus();
            videoSearch.select();
        }

        if (e.key === 'Escape') {
            if (videoSearch.value) {
                videoSearch.value = '';
                videoManager.currentSearchTerm = '';
                videoManager.applyFiltersAndSearch();
            }
        }

        if (e.key === 'ArrowLeft' && !prevBtn.disabled) {
            prevBtn.click();
        } else if (e.key === 'ArrowRight' && !nextBtn.disabled) {
            nextBtn.click();
        } else if (e.key === ' ' && document.querySelector('.video-container video')) {
            e.preventDefault();
            const videoElement = document.querySelector('.video-container video');
            if (videoElement.paused) {
                videoElement.play();
            } else {
                videoElement.pause();
            }
        }
    });
}

async function init() {
    createFloatingParticles();
    
    videoManager = new EnhancedVideoManager();
    videoPlayerController = new EnhancedVideoPlayer(videoManager);
    
    setupEventListeners();
    
    await videoManager.loadVideos();
    window.clearAllFiltersAndSearch();
    
    // Load the first video if one exists and none is currently selected
    if (videoManager.filteredVideos.length > 0 && !videoManager.currentVideoId) {
        const firstVideo = videoManager.filteredVideos[0];
        videoPlayerController.loadVideo(firstVideo);
    }
    
    videoManager.showNotification('Universal Video Player Initialized - All Platforms Supported!', 'success');
}

// Initialize when page loads
window.addEventListener('load', init);

// Global functions for HTML onclick handlers
window.removeFilter = function(type) {
    if (type === 'search') {
        document.getElementById('videoSearch').value = '';
        videoManager.currentSearchTerm = '';
    } else if (type === 'platform') {
        document.getElementById('filterOptions').value = 'all';
        videoManager.currentFilters.platform = 'all';
        videoManager.currentPlatform = 'all';
    }
    videoManager.applyFiltersAndSearch();
};

window.clearAllFiltersAndSearch = function() {
    document.getElementById('clearAllFilters').click();
};

// API Key Configuration
window.setAirtableApiKey = function(apiKey) {
    if (apiKey && apiKey.startsWith('pat')) {
        videoManager.services.airtable = new AirtableService(apiKey);
        videoManager.searchService = new SearchService(videoManager.services.airtable);
        videoManager.showNotification('Airtable API key configured successfully', 'success');
        return true;
    } else {
        videoManager.showNotification('Invalid Airtable API key format', 'error');
        return false;
    }
};