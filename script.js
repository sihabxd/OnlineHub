//==================== ENHANCED PROFESSIONAL CONFIGURATION ====================
const CONFIG = {
    AIRTABLE: {
        BASE_ID: 'appFZTp4rpbWSdLVO',
        TABLE_NAME: 'Videos',
        API_URL: 'https://api.airtable.com/v0'
    },
    SEARCH: {
        DEBOUNCE_DELAY: 100,
        MIN_SEARCH_LENGTH: 2,
        MAX_SUGGESTIONS: 10,
        SEARCH_FIELDS: ['title', 'description', 'type', 'tags', 'category', 'author'],
        CACHE_DURATION: 10 * 60 * 1000,
        FUZZY_SEARCH: true,
        ENABLE_SUGGESTIONS: true
    },
    PERFORMANCE: {
        LAZY_LOAD_THRESHOLD: 100,
        MAX_CACHE_SIZE: 100,
        PRELOAD_NEIGHBORS: 2,
        THUMBNAIL_QUALITY: 'medium'
    },
    UI: {
        THEMES: ['light', 'dark', 'auto'],
        ANIMATION_DURATION: 300,
        NOTIFICATION_TIMEOUT: 4000
    }
};

// ==================== PERFORMANCE OPTIMIZATION UTILITIES ====================
class PerformanceUtils {
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static memoize(fn) {
        const cache = new Map();
        return function(...args) {
            const key = JSON.stringify(args);
            if (cache.has(key)) return cache.get(key);
            const result = fn.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }

    static async preloadImages(urls) {
        const promises = urls.map(url => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        }));
        return Promise.allSettled(promises);
    }
}

// ==================== ENHANCED SUPPORTING SERVICES ====================
class DuplicatePreventionService {
    constructor() {
        this.videoHashes = new Map();
        this.similarityThreshold = 0.85;
    }

    generateVideoHash(videoData) {
        const content = `${videoData.videoId}-${videoData.type}-${videoData.title}`.toLowerCase();
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    isDuplicate(videoData, existingVideos) {
        const hash = this.generateVideoHash(videoData);
        
        if (this.videoHashes.has(hash)) {
            return true;
        }
        
        for (const existingVideo of existingVideos) {
            if (this.checkSimilarity(videoData, existingVideo, this.similarityThreshold)) {
                return true;
            }
        }
        
        this.videoHashes.set(hash, videoData);
        return false;
    }

    checkSimilarity(video1, video2, threshold = 0.8) {
        const titleSimilarity = this.calculateSimilarity(video1.title, video2.title);
        const urlSimilarity = video1.originalUrl && video2.originalUrl ? 
            this.calculateSimilarity(video1.originalUrl, video2.originalUrl) : 0;
        
        return Math.max(titleSimilarity, urlSimilarity) > threshold;
    }

    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        return (longer.length - this.editDistance(longer, shorter)) / parseFloat(longer.length);
    }

    editDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        
        const costs = new Array(s2.length + 1);
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        }
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }
}

class VideoAvailabilityChecker {
    constructor() {
        this.timeout = 5000;
        this.cache = new Map();
    }

    async checkVideoAvailability(video) {
        const cacheKey = `availability-${video.id}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            let isAvailable = false;

            if (video.type === 'direct' || video.url.startsWith('http')) {
                isAvailable = await this.checkDirectUrl(video.url);
            } else {
                isAvailable = await this.checkWithFallback(video);
            }

            this.cache.set(cacheKey, isAvailable);
            setTimeout(() => this.cache.delete(cacheKey), 60000); // Cache for 1 minute
            return isAvailable;
        } catch (error) {
            console.warn('Availability check failed:', error);
            return false;
        }
    }

    async checkDirectUrl(url) {
        try {
            const response = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors'
            });
            return true;
        } catch (error) {
            // Try GET request as fallback
            try {
                const response = await fetch(url, { 
                    method: 'GET',
                    mode: 'no-cors',
                    signal: AbortSignal.timeout(this.timeout)
                });
                return true;
            } catch {
                return false;
            }
        }
    }

    async checkWithFallback(video) {
        switch(video.type) {
            case 'youtube':
                return await this.checkYouTubeAvailability(video.videoId);
            case 'drive':
                return await this.checkDriveAvailability(video.videoId);
            case 'vimeo':
                return await this.checkVimeoAvailability(video.videoId);
            default:
                return true;
        }
    }

    async checkYouTubeAvailability(videoId) {
        try {
            const response = await fetch(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, {
                signal: AbortSignal.timeout(this.timeout)
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async checkDriveAvailability(fileId) {
        try {
            const response = await fetch(`https://drive.google.com/thumbnail?id=${fileId}&sz=w100`, {
                signal: AbortSignal.timeout(this.timeout)
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async checkVimeoAvailability(videoId) {
        try {
            const response = await fetch(`https://vumbnail.com/${videoId}.jpg`, {
                signal: AbortSignal.timeout(this.timeout)
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

class ThumbnailManager {
    constructor() {
        this.fallbackThumbnails = new Map();
        this.customThumbnails = new Map();
        this.imageCache = new Map();
        this.qualitySettings = {
            low: 'w200',
            medium: 'w400',
            high: 'w800'
        };
    }

    async getEnhancedThumbnail(video, quality = 'medium') {
        const cacheKey = `${video.id}-${quality}`;
        
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }

        const sources = [
            () => this.getCustomThumbnail(video),
            () => this.getPlatformThumbnail(video, quality),
            () => this.generatePlaceholderThumbnail(video)
        ];

        for (const source of sources) {
            try {
                const thumbnail = await source();
                if (await this.isImageValid(thumbnail)) {
                    this.imageCache.set(cacheKey, thumbnail);
                    return thumbnail;
                }
            } catch (error) {
                console.warn('Thumbnail source failed:', error);
            }
        }
        
        const fallback = this.generatePlaceholderThumbnail(video);
        this.imageCache.set(cacheKey, fallback);
        return fallback;
    }

    async getPlatformThumbnail(video, quality = 'medium') {
        if (video.thumbnail && await this.isImageValid(video.thumbnail)) {
            return video.thumbnail;
        }
        
        switch(video.type) {
            case 'youtube':
                const qualityParam = quality === 'high' ? 'maxresdefault' : 'hqdefault';
                return `https://img.youtube.com/vi/${video.videoId}/${qualityParam}.jpg`;
            case 'drive':
                return `https://drive.google.com/thumbnail?id=${video.videoId}&sz=${this.qualitySettings[quality]}`;
            case 'vimeo':
                return `https://vumbnail.com/${video.videoId}.jpg`;
            case 'dailymotion':
                return `https://www.dailymotion.com/thumbnail/video/${video.videoId}`;
            default:
                return video.thumbnail || '';
        }
    }

    async getCustomThumbnail(video) {
        if (this.customThumbnails.has(video.id)) {
            return this.customThumbnails.get(video.id);
        }
        return null;
    }

    generatePlaceholderThumbnail(video) {
        const platformColors = {
            youtube: '#FF0000',
            drive: '#4285F4',
            vimeo: '#1AB7EA',
            dailymotion: '#0066DC',
            facebook: '#1877F2',
            instagram: '#E4405F',
            tiktok: '#000000',
            twitter: '#1DA1F2',
            twitch: '#9146FF',
            streamable: '#0F90FA',
            dropbox: '#0061FF',
            photos: '#4285F4',
            direct: '#666666',
            other: '#333333'
        };
        
        const color = platformColors[video.type] || '#333333';
        const platformName = video.type.charAt(0).toUpperCase() + video.type.slice(1);
        
        return `data:image/svg+xml;base64,${btoa(`
            <svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="70" fill="${color}"/>
                <path d="M35 30L50 45H65L35" stroke="white" stroke-width="2"/>
                <text x="50" y="60" font-family="Arial" font-size="8" fill="white" text-anchor="middle">${platformName}</text>
            </svg>
        `)}`;
    }

    async isImageValid(url) {
        if (!url) return false;
        if (url.startsWith('data:')) return true;
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    setCustomThumbnail(videoId, thumbnailUrl) {
        this.customThumbnails.set(videoId, thumbnailUrl);
        this.imageCache.clear(); // Clear cache to force refresh
    }

    clearCache() {
        this.imageCache.clear();
    }
}

class VideoAnalytics {
    constructor() {
        this.stats = new Map();
        this.sessionStart = Date.now();
    }

    trackVideoEvent(event, video, metadata = {}) {
        const analyticsData = {
            event,
            videoId: video.id,
            platform: video.type,
            timestamp: new Date().toISOString(),
            duration: metadata.duration || 0,
            completion: metadata.completion || 0,
            userAgent: navigator.userAgent,
            sessionDuration: Date.now() - this.sessionStart
        };

        this.updateVideoStats(video, event, metadata);
        
        console.log('Video Analytics:', analyticsData);
        
        return analyticsData;
    }

    updateVideoStats(video, event, metadata) {
        const stats = this.getVideoStats(video.id);
        
        switch(event) {
            case 'play':
                stats.playCount = (stats.playCount || 0) + 1;
                stats.lastPlayed = new Date().toISOString();
                break;
            case 'complete':
                stats.completionCount = (stats.completionCount || 0) + 1;
                stats.totalWatchTime = (stats.totalWatchTime || 0) + (metadata.duration || 0);
                break;
            case 'error':
                stats.errorCount = (stats.errorCount || 0) + 1;
                break;
            case 'load':
                stats.loadCount = (stats.loadCount || 0) + 1;
                break;
            case 'seek':
                stats.seekCount = (stats.seekCount || 0) + 1;
                break;
        }
        
        this.saveVideoStats(video.id, stats);
    }

    getVideoStats(videoId) {
        return this.stats.get(videoId) || {
            playCount: 0,
            completionCount: 0,
            errorCount: 0,
            loadCount: 0,
            seekCount: 0,
            totalWatchTime: 0,
            lastPlayed: null
        };
    }

    saveVideoStats(videoId, stats) {
        this.stats.set(videoId, stats);
    }

    getPopularVideos(videos, limit = 10) {
        return videos
            .map(video => ({
                video,
                score: this.calculatePopularityScore(video)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.video);
    }

    calculatePopularityScore(video) {
        const stats = this.getVideoStats(video.id);
        const playScore = stats.playCount * 10;
        const completionScore = stats.completionCount * 20;
        const recencyBonus = stats.lastPlayed ? 
            Math.max(0, 100 - (Date.now() - new Date(stats.lastPlayed).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        return playScore + completionScore + recencyBonus;
    }

    getSessionDuration() {
        return Date.now() - this.sessionStart;
    }
}

class PerformanceOptimizer {
    constructor() {
        this.intersectionObserver = new IntersectionObserver(
            this.handleIntersection.bind(this),
            { rootMargin: '100px', threshold: 0.01 }
        );
        this.observedElements = new Set();
        this.lazyLoadQueue = new Map();
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadLazyContent(entry.target);
            }
        });
    }

    setupLazyLoading() {
        document.querySelectorAll('[data-lazy-src]').forEach(element => {
            this.observeElement(element);
        });
    }

    observeElement(element) {
        if (!this.observedElements.has(element)) {
            this.intersectionObserver.observe(element);
            this.observedElements.add(element);
        }
    }

    loadLazyContent(element) {
        const src = element.getAttribute('data-lazy-src');
        if (src) {
            if (element.tagName === 'IMG') {
                element.src = src;
            } else if (element.tagName === 'IFRAME') {
                element.src = src;
            }
            element.removeAttribute('data-lazy-src');
            this.unobserveElement(element);
        }
    }

    unobserveElement(element) {
        this.intersectionObserver.unobserve(element);
        this.observedElements.delete(element);
    }

    preloadResources(urls) {
        return PerformanceUtils.preloadImages(urls);
    }

    cleanup() {
        this.intersectionObserver.disconnect();
        this.observedElements.clear();
        this.lazyLoadQueue.clear();
    }
}

// ==================== ENHANCED UNIVERSAL VIDEO PARSER ====================
class UniversalVideoParser {
    static parseURL(url) {
        if (!url) return null;
        
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
                
                if (url.includes('playlist')) {
                    return {
                        videoId: `playlist-${videoId}`,
                        type: 'youtube_playlist',
                        embedUrls: [
                            `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1&modestbranding=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`,
                            `https://www.youtube-nocookie.com/embed/videoseries?list=${videoId}&autoplay=1&modestbranding=1&rel=0&playsinline=1`
                        ],
                        thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgMTAwIDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzAiIGZpbGw9IiNmMTBhMGIiLz48dGV4dCB4PSI1MCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPllvdVR1YmUgUGxheWxpc3Q8L3RleHQ+PC9zdmc+',
                        title: 'YouTube Playlist',
                        description: 'YouTube Playlist'
                    };
                } else {
                    const embedUrls = [
                        `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`,
                        `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`,
                        `https://www.youtube.com/embed/${videoId}?autoplay=1&origin=*`
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

// ==================== ENHANCED VIDEO METADATA SERVICE ====================
class VideoMetadataService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    }

    async fetchEnhancedMetadata(videoData) {
        const cacheKey = `metadata-${videoData.videoId}-${videoData.type}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            let enhancedData = { ...videoData };
            
            switch(videoData.type) {
                case 'youtube':
                    enhancedData = await this.enhanceYouTubeMetadata(videoData);
                    break;
                case 'vimeo':
                    enhancedData = await this.enhanceVimeoMetadata(videoData);
                    break;
                case 'dailymotion':
                    enhancedData = await this.enhanceDailymotionMetadata(videoData);
                    break;
            }
            
            this.cache.set(cacheKey, enhancedData);
            setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
            
            return enhancedData;
        } catch (error) {
            console.warn('Metadata enhancement failed:', error);
            return videoData;
        }
    }

    async enhanceYouTubeMetadata(videoData) {
        try {
            // Try oEmbed first
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoData.originalUrl)}&format=json`;
            const response = await fetch(oEmbedUrl);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    ...videoData,
                    title: data.title || videoData.title,
                    author: data.author_name || videoData.author,
                    thumbnail: data.thumbnail_url || videoData.thumbnail
                };
            }
        } catch (error) {
            console.warn('YouTube oEmbed failed:', error);
        }
        return videoData;
    }

    async enhanceVimeoMetadata(videoData) {
        try {
            const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoData.originalUrl)}`;
            const response = await fetch(oEmbedUrl);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    ...videoData,
                    title: data.title || videoData.title,
                    description: data.description || videoData.description,
                    author: data.author_name || videoData.author,
                    thumbnail: data.thumbnail_url || videoData.thumbnail,
                    duration: Math.round(data.duration / 60),
                    uploadDate: data.upload_date
                };
            }
        } catch (error) {
            console.warn('Vimeo oEmbed failed:', error);
        }
        return videoData;
    }

    async enhanceDailymotionMetadata(videoData) {
        try {
            const oEmbedUrl = `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(videoData.originalUrl)}&format=json`;
            const response = await fetch(oEmbedUrl);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    ...videoData,
                    title: data.title || videoData.title,
                    author: data.author_name || videoData.author,
                    thumbnail: data.thumbnail_url || videoData.thumbnail
                };
            }
        } catch (error) {
            console.warn('Dailymotion oEmbed failed:', error);
        }
        return videoData;
    }

    clearCache() {
        this.cache.clear();
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
        this.searchHistory = [];
        this.isLoading = false;
        
        // Enhanced services
        this.services = {
            airtable: new AirtableService('patPnJxM2TRWXuka0.4f7e3477fbf12deeab524c98a77c473a737773a6f0d788b68f103446d50a8b2f'),
            metadata: new VideoMetadataService()
        };
        
        // New enhanced services
        this.duplicateChecker = new DuplicatePreventionService();
        this.availabilityChecker = new VideoAvailabilityChecker();
        this.thumbnailManager = new ThumbnailManager();
        this.analytics = new VideoAnalytics();
        this.performanceOptimizer = new PerformanceOptimizer();
        
        this.searchService = new SearchService(this.services.airtable);
        this.cache = new Map();
        this.searchTimeout = null;

        this.setupErrorHandling();
    }

    setupErrorHandling() {
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        this.showNotification('An unexpected error occurred', 'error');
    }

    handlePromiseRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        this.showNotification('An operation failed', 'warning');
    }

    async loadVideos() {
        if (this.isLoading) return this.allVideos;
        
        this.isLoading = true;
        this.showNotification('Loading videos...', 'info');
        
        try {
            // Always load from Airtable
            const freshVideos = await this.services.airtable.getAllVideos();
            this.allVideos = freshVideos;
            console.log(`Loaded ${this.allVideos.length} videos from Airtable`);
            
            await this.searchService.buildSearchIndex(this.allVideos);
            this.restoreApplicationState();
            this.applyFiltersAndSearch();
            
            this.showNotification(`Loaded ${this.allVideos.length} videos`, 'success');
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
            case 'most_popular':
                const popularVideos = this.analytics.getPopularVideos(sorted, sorted.length);
                return popularVideos;
        }
        
        return sorted;
    }

    loadVideoById(videoId) {
        const videoIndex = this.filteredVideos.findIndex(v => v.id === videoId);
        if (videoIndex !== -1) {
            this.currentVideoId = videoId;
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
            nextIndex = 0;
        }
        
        return this.loadVideoById(this.filteredVideos[nextIndex].id);
    }

    prevVideo() {
        if (this.filteredVideos.length === 0) return null;
        
        const currentIndex = this.filteredVideos.findIndex(v => v.id === this.currentVideoId);
        let prevIndex = currentIndex - 1;
        
        if (prevIndex < 0) {
            prevIndex = this.filteredVideos.length - 1;
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
        
        this.recentlyPlayed = this.recentlyPlayed.slice(0, 50);
    }

    addToSearchHistory(searchTerm) {
        if (!searchTerm || searchTerm.length < CONFIG.SEARCH.MIN_SEARCH_LENGTH) return;
        
        const existingIndex = this.searchHistory.findIndex(term => term === searchTerm);
        if (existingIndex !== -1) {
            this.searchHistory.splice(existingIndex, 1);
        }
        
        this.searchHistory.unshift(searchTerm);
        this.searchHistory = this.searchHistory.slice(0, 10);
    }

    getRecentlyPlayedData(videoId) {
        return this.recentlyPlayed.find(v => v.id === videoId);
    }

    calculatePopularityScore(video) {
        const playedData = this.getRecentlyPlayedData(video.id);
        const analyticsData = this.analytics.getVideoStats(video.id);
        const playCount = playedData?.playCount || 0;
        const viewCount = video.viewCount || 0;
        const analyticsScore = this.analytics.calculatePopularityScore(video);
        
        return viewCount + (playCount * 10) + (analyticsScore * 0.5);
    }

    restoreApplicationState() {
        // No localStorage restoration needed - all state is managed in memory
    }

    updateUI() {
        this.updateVideoCount();
        this.renderPlaylist();
        this.updateNavigationButtons();
        this.updateActiveVideoHighlight();
    }

    updateVideoCount() {
        const countElement = document.getElementById('videoCount');
        if (countElement) {
            const total = this.allVideos.length;
            const filtered = this.filteredVideos.length;
            countElement.textContent = filtered === total ? 
                `${total} video${total !== 1 ? 's' : ''}` : 
                `${filtered} of ${total} video${total !== 1 ? 's' : ''}`;
        }
    }

    async renderPlaylist() {
        const videoList = document.getElementById('videoList');
        if (!videoList) return;

        if (this.filteredVideos.length === 0) {
            videoList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        videoList.innerHTML = this.filteredVideos.map((video, index) => 
            this.createVideoItemHTML(video, index)
        ).join('');

        // Enhance thumbnails after initial render
        this.enhanceThumbnails();
        
        // Setup lazy loading
        this.performanceOptimizer.setupLazyLoading();
    }

    createVideoItemHTML(video, index) {
        const isActive = video.id === this.currentVideoId;
        const recentlyPlayed = this.getRecentlyPlayedData(video.id);
        const popularityScore = this.calculatePopularityScore(video);
        const analyticsStats = this.analytics.getVideoStats(video.id);
        
        const thumbnailUrl = this.getThumbnailUrl(video);
        
        return `
            <div class="video-item ${video.type} ${isActive ? 'active' : ''}" 
                 data-video-id="${video.id}" data-index="${index}">
                <img class="video-thumb" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgMTAwIDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzAiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNMzUgMzBMNTAgNDVINjVMMzUiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+" 
                     data-lazy-src="${thumbnailUrl}"
                     alt="${video.title}" loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgMTAwIDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzAiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNMzUgMzBMNTAgNDVINjVMMzUiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+'">
                <div class="video-item-info">
                    <div class="video-item-title">${this.highlightSearchTerms(video.title)}</div>
                    <div class="video-item-meta">
                        <span class="video-duration">${video.duration || '--:--'}</span>
                        <span class="platform-tag">${video.type}</span>
                        ${recentlyPlayed ? '<span class="recent-badge" title="Recently played"><i class="fas fa-history"></i></span>' : ''}
                        ${popularityScore > 10 ? '<span class="popularity-badge" title="Popular video"><i class="fas fa-fire"></i></span>' : ''}
                        ${analyticsStats.playCount > 5 ? `<span class="play-count-badge" title="Played ${analyticsStats.playCount} times"><i class="fas fa-play-circle"></i> ${analyticsStats.playCount}</span>` : ''}
                        ${isActive ? '<span class="currently-playing-badge"><i class="fas fa-play"></i> Playing</span>' : ''}
                    </div>
                    ${video.description ? `<div class="video-item-description">${this.truncateText(video.description, 60)}</div>` : ''}
                </div>
            </div>
        `;
    }

    async enhanceThumbnails() {
        for (const video of this.filteredVideos.slice(0, 10)) { // Enhance first 10 only for performance
            try {
                const enhancedThumbnail = await this.thumbnailManager.getEnhancedThumbnail(video, 'medium');
                const imgElement = document.querySelector(`[data-video-id="${video.id}"] .video-thumb`);
                if (imgElement && imgElement.getAttribute('data-lazy-src') === this.getThumbnailUrl(video)) {
                    imgElement.setAttribute('data-lazy-src', enhancedThumbnail);
                }
            } catch (error) {
                console.warn('Failed to enhance thumbnail for video:', video.id, error);
            }
        }
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
                ${this.currentSearchTerm ? '<button onclick="window.clearAllFiltersAndSearch()" class="clear-all-btn">Clear All Filters</button>' : ''}
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
        if (!this.currentSearchTerm || !text) return this.escapeHtml(text);
        const regex = new RegExp(`(${this.currentSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, length) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
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
        
        if (!notification || !notificationText) {
            console[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log'](message);
            return;
        }

        notificationText.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, CONFIG.UI.NOTIFICATION_TIMEOUT);
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

            // Check for duplicates
            if (this.duplicateChecker.isDuplicate(parsed, this.allVideos)) {
                this.showNotification('This video already exists in your library', 'warning');
                return null;
            }

            // Check availability
            const isAvailable = await this.availabilityChecker.checkVideoAvailability(parsed);
            if (!isAvailable) {
                this.showNotification('Video may not be available or has been removed', 'warning');
            }

            // Enhance metadata
            const enhancedMetadata = await this.services.metadata.fetchEnhancedMetadata(parsed);

            const videoData = {
                id: enhancedMetadata.videoId,
                title: enhancedMetadata.title,
                description: enhancedMetadata.description,
                type: enhancedMetadata.type,
                duration: enhancedMetadata.duration || '--:--',
                url: enhancedMetadata.embedUrls[0],
                embedUrls: enhancedMetadata.embedUrls,
                thumbnail: enhancedMetadata.thumbnail,
                originalUrl: enhancedMetadata.originalUrl,
                author: enhancedMetadata.author || '',
                viewCount: enhancedMetadata.viewCount || 0,
                uploadDate: enhancedMetadata.uploadDate || ''
            };

            const createdVideo = await this.services.airtable.addVideo(videoData);
            
            // Update local state
            this.allVideos.push(createdVideo);
            await this.searchService.buildSearchIndex(this.allVideos);
            
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

    getRecommendedVideos(limit = 5) {
        return this.analytics.getPopularVideos(this.allVideos, limit);
    }

    async cleanupUnavailableVideos() {
        const unavailableVideos = [];
        
        for (const video of this.allVideos.slice(0, 20)) { // Check first 20 for performance
            try {
                const isAvailable = await this.availabilityChecker.checkVideoAvailability(video);
                if (!isAvailable) {
                    unavailableVideos.push(video);
                }
            } catch (error) {
                console.warn('Error checking availability for video:', video.id, error);
            }
        }
        
        return unavailableVideos;
    }

    exportVideoList(format = 'json') {
        const data = this.filteredVideos.length > 0 ? this.filteredVideos : this.allVideos;
        
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `videos-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        
        this.showNotification(`Exported ${data.length} videos as ${format.toUpperCase()}`, 'success');
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
        this.playbackStartTime = null;
        this.setupFallbackOptions();
    }

    async loadVideo(video) {
        if (!video) return;

        // Track video load event
        this.videoManager.analytics.trackVideoEvent('load', video);

        this.videoManager.loadVideoById(video.id);
        this.fallbackMessage.style.display = 'none';
        this.currentEmbedIndex = 0;
        this.currentVideoData = video;
        this.playbackStartTime = Date.now();

        // Show loading state
        this.currentVideoTitle.textContent = 'Loading...';
        this.currentVideoDescription.textContent = 'Fetching video information...';

        let embedUrls = video.embedUrls || [video.url || ""];
        let badgeClass = "";
        let badgeText = "";

        // Determine platform and set appropriate badge
        const platformConfig = {
            "youtube": { class: "badge-youtube", text: "YouTube" },
            "youtube_playlist": { class: "badge-youtube", text: "YouTube Playlist" },
            "drive": { class: "badge-drive", text: "Google Drive" },
            "vimeo": { class: "badge-vimeo", text: "Vimeo" },
            "dailymotion": { class: "badge-dailymotion", text: "Dailymotion" },
            "facebook": { class: "badge-facebook", text: "Facebook" },
            "instagram": { class: "badge-instagram", text: "Instagram" },
            "tiktok": { class: "badge-tiktok", text: "TikTok" },
            "twitter": { class: "badge-twitter", text: "Twitter/X" },
            "twitch": { class: "badge-twitch", text: "Twitch" },
            "streamable": { class: "badge-streamable", text: "Streamable" },
            "dropbox": { class: "badge-dropbox", text: "Dropbox" },
            "photos": { class: "badge-photos", text: "Google Photos" },
            "direct": { class: "badge-direct", text: "Direct Video" }
        };

        const config = platformConfig[video.type] || { class: "badge-other", text: video.type.charAt(0).toUpperCase() + video.type.slice(1) };
        badgeClass = config.class;
        badgeText = config.text;

        if (video.type === 'direct') {
            this.loadDirectVideo(video, embedUrls[0]);
            return;
        }

        // Check video availability before loading
        const isAvailable = await this.videoManager.availabilityChecker.checkVideoAvailability(video);
        if (!isAvailable) {
            this.showFallbackMessage(video);
            this.videoManager.showNotification('Video may not be available', 'warning');
            return;
        }

        // Set up loading timeout and error handling
        const loadingTimeout = setTimeout(() => {
            this.showFallbackMessage(video);
        }, 10000);

        const onLoad = () => {
            clearTimeout(loadingTimeout);
            this.videoPlayer.style.display = 'block';
            this.videoManager.showNotification(`Loaded ${badgeText} video`, 'success');
            this.videoManager.analytics.trackVideoEvent('play', video);
        };

        const onError = () => {
            clearTimeout(loadingTimeout);
            this.videoManager.analytics.trackVideoEvent('error', video, { error: 'embed_failed' });
            this.handleEmbedError(video, embedUrls);
        };

        this.videoPlayer.onload = onLoad;
        this.videoPlayer.onerror = onError;

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
        const videoContainer = this.videoPlayer.parentElement;
        
        // Remove existing video elements
        const existingVideo = videoContainer.querySelector('video');
        if (existingVideo) {
            existingVideo.remove();
        }
        
        // Hide the iframe
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
        
        // Add event listeners for analytics
        videoElement.addEventListener('play', () => {
            this.videoManager.analytics.trackVideoEvent('play', video);
        });
        
        videoElement.addEventListener('ended', () => {
            const duration = (Date.now() - this.playbackStartTime) / 1000;
            this.videoManager.analytics.trackVideoEvent('complete', video, { duration });
        });
        
        videoElement.addEventListener('error', () => {
            this.videoManager.analytics.trackVideoEvent('error', video, { error: 'direct_playback_failed' });
        });

        videoElement.addEventListener('seeked', () => {
            this.videoManager.analytics.trackVideoEvent('seek', video);
        });

        const source = document.createElement('source');
        source.src = url;
        source.type = this.getVideoMimeType(url);
        
        videoElement.appendChild(source);
        videoContainer.appendChild(videoElement);
        
        // Update UI
        this.currentVideoTitle.textContent = video.title;
        this.currentVideoDescription.textContent = video.description;
        this.currentPlatformBadge.className = 'platform-badge badge-direct';
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
            this.videoPlayer.src = embedUrls[this.currentEmbedIndex];
            this.videoManager.showNotification(`Trying alternative embed... (${this.currentEmbedIndex + 1}/${embedUrls.length})`, 'info');
        } else {
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

        if (video && openOriginal && downloadVideo) {
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
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(15000)
            });
            
            if (!response.ok) {
                if (response.status === 429 && retries > 0) {
                    await this.delay(this.retryDelay * 2);
                    return this.handleRequest(url, options, retries - 1);
                } else if (response.status >= 500 && retries > 0) {
                    await this.delay(this.retryDelay);
                    return this.handleRequest(url, options, retries - 1);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (retries > 0 && error.name !== 'AbortError') {
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
        const cacheKey = 'all-videos';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

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

            this.cache.set(cacheKey, videos);
            setTimeout(() => this.cache.delete(cacheKey), CONFIG.SEARCH.CACHE_DURATION);
            
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
                    thumbnail: video.thumbnail || '',
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    viewCount: video.viewCount || 0,
                    tags: video.tags || [],
                    category: video.category || 'general',
                    author: video.author || '',
                    uploadDate: video.uploadDate || ''
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
                author: createdRecord.fields.author || '',
                uploadDate: createdRecord.fields.uploadDate || ''
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

class SearchService {
    constructor(airtableService) {
        this.airtableService = airtableService;
        this.searchIndex = new Map();
        this.suggestionCache = new Map();
    }

    async buildSearchIndex(videos) {
        this.searchIndex.clear();
        videos.forEach(video => {
            const searchableText = CONFIG.SEARCH.SEARCH_FIELDS
                .map(field => String(video[field] || '').toLowerCase())
                .join(' ');
            
            const words = this.tokenize(searchableText);
            words.forEach(word => {
                if (!this.searchIndex.has(word)) this.searchIndex.set(word, new Set());
                this.searchIndex.get(word).add(video.id);
            });
        });
    }

    tokenize(text) {
        return text
            .toLowerCase()
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

        // Title matches
        videos.forEach(video => {
            if (video.title.toLowerCase().includes(queryLower)) {
                suggestions.push({ type: 'title', text: video.title, video: video });
            }
        });

        // Platform matches
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
    if (!particlesContainer) return;
    
    const particleCount = 20; // Reduced for better performance

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 80 + 20;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const delay = Math.random() * 10;
        const duration = Math.random() * 10 + 15;

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
    const exportBtn = document.getElementById('exportBtn');

    if (!videoSearch || !sortOptions || !filterOptions) {
        console.warn('Some required elements not found');
        return;
    }

    // Search with debouncing
    const debouncedSearch = PerformanceUtils.debounce((query) => {
        videoManager.currentSearchTerm = query;
        videoManager.addToSearchHistory(query);
        videoManager.applyFiltersAndSearch();
        if (query) {
            videoManager.showNotification(`Searching for "${query}"`, 'info');
        }
    }, CONFIG.SEARCH.DEBOUNCE_DELAY);

    videoSearch.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
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
            if (filterOptions) filterOptions.value = platform;
            
            videoManager.applyFiltersAndSearch();
            videoManager.showNotification(`Showing ${platform} videos`, 'success');
        });
    });

    // Clear actions
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            videoSearch.value = '';
            videoManager.currentSearchTerm = '';
            videoManager.applyFiltersAndSearch();
            videoManager.showNotification('Search cleared', 'info');
        });
    }

    if (clearAllFilters) {
        clearAllFilters.addEventListener('click', () => {
            videoSearch.value = '';
            videoManager.currentSearchTerm = '';
            if (filterOptions) filterOptions.value = 'all';
            videoManager.currentFilters.platform = 'all';
            videoManager.currentPlatform = 'all';
            if (sortOptions) sortOptions.value = 'default';
            videoManager.currentSortOption = 'default';
            
            document.querySelectorAll('.platform-tab').forEach(t => t.classList.remove('active'));
            const allTab = document.querySelector('.platform-tab[data-platform="all"]');
            if (allTab) allTab.classList.add('active');
            
            videoManager.applyFiltersAndSearch();
            videoManager.showNotification('All filters cleared', 'success');
        });
    }

    // Navigation
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const video = videoManager.prevVideo();
            if (video) {
                videoPlayerController.loadVideo(video);
                videoManager.showNotification(`Now playing: ${video.title}`, 'success');
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const video = videoManager.nextVideo();
            if (video) {
                videoPlayerController.loadVideo(video);
                videoManager.showNotification(`Now playing: ${video.title}`, 'success');
            }
        });
    }

    // Add custom video
    if (addCustomVideoBtn && customVideoUrl) {
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
    }

    // Export functionality
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            videoManager.exportVideoList('json');
        });
    }

    // Video list click delegation
    if (videoList) {
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
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (videoSearch) {
                videoSearch.focus();
                videoSearch.select();
            }
        }

        if (e.key === 'Escape') {
            if (videoSearch && document.activeElement === videoSearch) {
                videoSearch.value = '';
                videoManager.currentSearchTerm = '';
                videoManager.applyFiltersAndSearch();
            }
        }

        if (prevBtn && e.key === 'ArrowLeft' && !prevBtn.disabled) {
            prevBtn.click();
        } else if (nextBtn && e.key === 'ArrowRight' && !nextBtn.disabled) {
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

    // Setup lazy loading
    videoManager.performanceOptimizer.setupLazyLoading();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            videoManager.performanceOptimizer.cleanup();
        }
    });
}

async function init() {
    try {
        createFloatingParticles();
        
        videoManager = new EnhancedVideoManager();
        videoPlayerController = new EnhancedVideoPlayer(videoManager);
        
        setupEventListeners();
        
        await videoManager.loadVideos();
        
        // Load the first video if one exists and none is currently selected
        if (videoManager.filteredVideos.length > 0 && !videoManager.currentVideoId) {
            const firstVideo = videoManager.filteredVideos[0];
            videoPlayerController.loadVideo(firstVideo);
        }
        
        videoManager.showNotification('Enhanced Universal Video Player Initialized!', 'success');
        
        // Load recommendations in background
        setTimeout(() => {
            const recommendations = videoManager.getRecommendedVideos(3);
            if (recommendations.length > 0) {
                console.log('Recommended videos:', recommendations.map(v => v.title));
            }
        }, 2000);
    } catch (error) {
        console.error('Error initializing application:', error);
        if (videoManager && videoManager.showNotification) {
            videoManager.showNotification('Failed to initialize application', 'error');
        }
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Global functions for HTML onclick handlers
window.removeFilter = function(type) {
    if (type === 'search') {
        const videoSearch = document.getElementById('videoSearch');
        if (videoSearch) {
            videoSearch.value = '';
            videoManager.currentSearchTerm = '';
        }
    } else if (type === 'platform') {
        const filterOptions = document.getElementById('filterOptions');
        if (filterOptions) {
            filterOptions.value = 'all';
            videoManager.currentFilters.platform = 'all';
            videoManager.currentPlatform = 'all';
        }
    }
    videoManager.applyFiltersAndSearch();
};

window.clearAllFiltersAndSearch = function() {
    const clearAllFilters = document.getElementById('clearAllFilters');
    if (clearAllFilters) {
        clearAllFilters.click();
    }
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

// Performance testing
window.performanceTest = async function() {
    const startTime = performance.now();
    
    // Test video loading
    await videoManager.loadVideos();
    
    // Test search
    videoManager.currentSearchTerm = 'test';
    videoManager.applyFiltersAndSearch();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    videoManager.showNotification(`Performance test completed in ${duration.toFixed(2)}ms`, 'success');
    return duration;
};

// Export for global access
window.VideoManager = EnhancedVideoManager;
window.VideoPlayer = EnhancedVideoPlayer;
window.PerformanceUtils = PerformanceUtils;

// Service Worker registration for offline functionality
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}