class PixelDSPlayer {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.currentTrackIndex = 0;
        this.playlist = [];
        this.isPlaying = false;
        this.isShuffled = false;
        this.isLooped = false;
        this.volume = 0.5;
        this.isSleepMode = false;
        this.easterEggCount = 0;
        this.sleepTimerHandle = null;
        
        // Settings
        this.settings = {
            theme: 'default',
            audioQuality: 'high',
            autoPlayNext: true,
            buttonSounds: true,
            showVisualizer: true,
            sleepTimer: 0,
            eqPreset: 'flat'
        };
        
        this.metadataCache = new Map();
        
        this.initializeElements();
        this.loadSettings();
        this.setupEventListeners();
        this.setupEasterEgg();
        this.updateTime();
        this.playStartupSound();
    }

    initializeElements() {
        // Controls
        this.playBtn = document.getElementById('playBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.loopBtn = document.getElementById('loopBtn');
        
        // Progress
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressHandle = document.getElementById('progressHandle');
        this.currentTimeEl = document.getElementById('currentTime');
        this.totalTimeEl = document.getElementById('totalTime');
        
        // Volume
        this.volumeBar = document.getElementById('volumeBar');
        this.volumeFill = document.getElementById('volumeFill');
        this.volumeHandle = document.getElementById('volumeHandle');
        
        // Track info
        this.trackTitle = document.getElementById('trackTitle');
        this.trackArtist = document.getElementById('trackArtist');
        
        // Menu buttons
        this.libraryBtn = document.getElementById('libraryBtn');
        this.playlistBtn = document.getElementById('playlistBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // File input
        this.fileInput = document.getElementById('fileInput');
        this.folderInput = document.getElementById('folderInput');
        
        // Visualizer
        this.visualizer = document.getElementById('visualizer');
        this.mascot = document.getElementById('mascot');
        
        // Playlist modal
        this.playlistModal = document.getElementById('playlistModal');
        this.closePlaylistBtn = document.getElementById('closePlaylist');
        this.playlistBody = document.getElementById('playlistBody');
        
        // Settings modal
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettings');
        this.themeSelect = document.getElementById('themeSelect');
        this.audioQualitySelect = document.getElementById('audioQuality');
        this.autoPlayNextCheck = document.getElementById('autoPlayNext');
        this.buttonSoundsCheck = document.getElementById('buttonSounds');
        this.showVisualizerCheck = document.getElementById('showVisualizer');
        this.sleepTimerSelect = document.getElementById('sleepTimer');
        this.eqPresetSelect = document.getElementById('eqPreset');
        this.resetSettingsBtn = document.getElementById('resetSettings');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        
        // Set initial volume
        this.audioPlayer.volume = this.volume;
        this.updateVolumeDisplay();
    }

    loadSettings() {
        const saved = localStorage.getItem('pixelDSSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        this.applySettings();
    }

    saveSettings() {
        localStorage.setItem('pixelDSSettings', JSON.stringify(this.settings));
    }

    applySettings() {
        // Apply theme
        document.body.className = this.settings.theme === 'default' ? '' : `theme-${this.settings.theme}`;
        
        // Apply visualizer setting
        this.visualizer.style.display = this.settings.showVisualizer ? 'flex' : 'none';
        
        // Apply audio quality
        this.audioPlayer.preload = this.settings.audioQuality === 'high' ? 'auto' : 'metadata';
        
        // Update UI
        this.updateSettingsUI();
        
        // Apply sleep timer
        this.setSleepTimer(this.settings.sleepTimer);
    }

    updateSettingsUI() {
        this.themeSelect.value = this.settings.theme;
        this.audioQualitySelect.value = this.settings.audioQuality;
        this.autoPlayNextCheck.checked = this.settings.autoPlayNext;
        this.buttonSoundsCheck.checked = this.settings.buttonSounds;
        this.showVisualizerCheck.checked = this.settings.showVisualizer;
        this.sleepTimerSelect.value = this.settings.sleepTimer;
        this.eqPresetSelect.value = this.settings.eqPreset;
    }

    setSleepTimer(minutes) {
        if (this.sleepTimerHandle) {
            clearTimeout(this.sleepTimerHandle);
            this.sleepTimerHandle = null;
        }
        
        if (minutes > 0) {
            this.sleepTimerHandle = setTimeout(() => {
                this.toggleSleepMode();
            }, minutes * 60 * 1000);
        }
    }

    setupEventListeners() {
        // Playback controls
        this.playBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.loopBtn.addEventListener('click', () => this.toggleLoop());
        
        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.setupSlider(this.progressBar, this.progressHandle, (percent) => {
            if (this.audioPlayer.duration) {
                this.audioPlayer.currentTime = this.audioPlayer.duration * percent;
            }
        });
        
        // Volume bar
        this.volumeBar.addEventListener('click', (e) => this.setVolume(e));
        this.setupSlider(this.volumeBar, this.volumeHandle, (percent) => {
            this.volume = percent;
            this.audioPlayer.volume = this.volume;
            this.updateVolumeDisplay();
        });
        
        // Menu buttons
        this.libraryBtn.addEventListener('click', () => this.openLibrary());
        this.playlistBtn.addEventListener('click', () => this.togglePlaylist());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        
        // File input
        this.fileInput.addEventListener('change', (e) => this.loadFiles(e));
        this.folderInput.addEventListener('change', (e) => this.loadFolder(e));
        
        // Audio events
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('ended', () => this.onTrackEnd());
        this.audioPlayer.addEventListener('loadedmetadata', () => this.onTrackLoaded());
        
        // Button sound effects
        this.addButtonSounds();
        
        // Playlist modal
        this.closePlaylistBtn.addEventListener('click', () => this.closePlaylist());
        this.playlistModal.addEventListener('click', (e) => {
            if (e.target === this.playlistModal) this.closePlaylist();
        });
        
        // Settings modal
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });
        
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveCurrentSettings());
        
        // Setting changes
        this.themeSelect.addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.applySettings();
        });
        
        this.audioQualitySelect.addEventListener('change', (e) => {
            this.settings.audioQuality = e.target.value;
            this.applySettings();
        });
        
        this.autoPlayNextCheck.addEventListener('change', (e) => {
            this.settings.autoPlayNext = e.target.checked;
        });
        
        this.buttonSoundsCheck.addEventListener('change', (e) => {
            this.settings.buttonSounds = e.target.checked;
        });
        
        this.showVisualizerCheck.addEventListener('change', (e) => {
            this.settings.showVisualizer = e.target.checked;
            this.applySettings();
        });
        
        this.sleepTimerSelect.addEventListener('change', (e) => {
            this.settings.sleepTimer = parseInt(e.target.value);
            this.setSleepTimer(this.settings.sleepTimer);
        });
        
        this.eqPresetSelect.addEventListener('change', (e) => {
            this.settings.eqPreset = e.target.value;
            this.applyEqualizer();
        });
    }

    setupSlider(container, handle, callback) {
        let isDragging = false;
        
        const updateSlider = (e) => {
            const rect = container.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            callback(percent);
        };
        
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        handle.addEventListener('touchstart', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) updateSlider(e);
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDragging) updateSlider(e.touches[0]);
        });
        
        document.addEventListener('mouseup', () => isDragging = false);
        document.addEventListener('touchend', () => isDragging = false);
    }

    addButtonSounds() {
        const buttons = document.querySelectorAll('.ds-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => this.playButtonSound());
        });
    }

    playButtonSound() {
        if (!this.settings.buttonSounds) return;
        
        // Create a quick beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    playStartupSound() {
        // DS-style startup jingle
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((frequency, index) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }, index * 150);
        });
    }

    togglePlayPause() {
        if (this.playlist.length === 0) {
            this.openLibrary();
            return;
        }
        
        if (this.isPlaying) {
            this.audioPlayer.pause();
            this.playBtn.textContent = '▶️';
            this.visualizer.classList.remove('playing');
        } else {
            this.audioPlayer.play();
            this.playBtn.textContent = '⏸️';
            this.visualizer.classList.add('playing');
        }
        this.isPlaying = !this.isPlaying;
    }

    previousTrack() {
        if (this.playlist.length === 0) return;
        
        this.currentTrackIndex = this.isShuffled 
            ? Math.floor(Math.random() * this.playlist.length)
            : (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        
        this.loadCurrentTrack();
        this.updatePlaylistDisplay();
    }

    nextTrack() {
        if (this.playlist.length === 0) return;
        
        this.currentTrackIndex = this.isShuffled 
            ? Math.floor(Math.random() * this.playlist.length)
            : (this.currentTrackIndex + 1) % this.playlist.length;
        
        this.loadCurrentTrack();
        this.updatePlaylistDisplay();
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('shuffle-active', this.isShuffled);
    }

    toggleLoop() {
        this.isLooped = !this.isLooped;
        this.loopBtn.classList.toggle('loop-active', this.isLooped);
        this.audioPlayer.loop = this.isLooped;
    }

    openLibrary() {
        // Check if File System Access API is supported
        if ('showDirectoryPicker' in window) {
            this.openFolderModern();
        } else {
            // Fallback to webkitdirectory
            this.folderInput.click();
        }
    }

    async openFolderModern() {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const files = await this.scanDirectoryRecursive(dirHandle);
            this.playlist = files.filter(file => file.type.startsWith('audio/'));
            
            if (this.playlist.length > 0) {
                this.currentTrackIndex = 0;
                this.loadCurrentTrack();
                this.updatePlaylistDisplay();
            }
        } catch (err) {
            console.log('User cancelled folder selection');
        }
    }

    async scanDirectoryRecursive(dirHandle) {
        const files = [];
        
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                if (file.type.startsWith('audio/')) {
                    files.push(file);
                }
            } else if (entry.kind === 'directory') {
                const subFiles = await this.scanDirectoryRecursive(entry);
                files.push(...subFiles);
            }
        }
        
        return files;
    }

    togglePlaylist() {
        if (this.playlistModal.classList.contains('show')) {
            this.closePlaylist();
        } else {
            this.openPlaylist();
        }
    }

    openPlaylist() {
        this.updatePlaylistDisplay();
        this.playlistModal.classList.remove('hiding');
        this.playlistModal.classList.add('show');
    }

    closePlaylist() {
        this.playlistModal.classList.add('hiding');
        setTimeout(() => {
            this.playlistModal.classList.remove('show', 'hiding');
        }, 300);
    }

    async updatePlaylistDisplay() {
        if (this.playlist.length === 0) {
            this.playlistBody.innerHTML = `
                <div class="empty-playlist">
                    <p>No tracks loaded</p>
                    <p>Click LIBRARY to add music</p>
                </div>
            `;
            return;
        }

        const trackElements = [];
        
        for (let index = 0; index < this.playlist.length; index++) {
            const file = this.playlist[index];
            const metadata = await this.extractMetadata(file);
            const currentClass = index === this.currentTrackIndex ? 'current' : '';
            
            trackElements.push(`
                <div class="playlist-track ${currentClass}" data-index="${index}">
                    <div class="track-name">${metadata.title}</div>
                    <div class="track-details">
                        <span class="track-artist">${metadata.artist}</span>
                        <span class="track-duration">--:--</span>
                    </div>
                </div>
            `);
        }

        this.playlistBody.innerHTML = trackElements.join('');

        // Add click handlers
        this.playlistBody.querySelectorAll('.playlist-track').forEach((track, index) => {
            track.addEventListener('click', () => {
                this.currentTrackIndex = index;
                this.loadCurrentTrack();
                if (!this.isPlaying) {
                    this.togglePlayPause();
                }
                this.updatePlaylistDisplay();
            });
        });

        // Load durations asynchronously
        this.loadTrackDurations();
    }

    async loadTrackDurations() {
        const tracks = this.playlistBody.querySelectorAll('.playlist-track');
        
        for (let i = 0; i < Math.min(tracks.length, this.playlist.length); i++) {
            try {
                const file = this.playlist[i];
                const duration = await this.getAudioDuration(file);
                const durationEl = tracks[i].querySelector('.track-duration');
                if (durationEl) {
                    durationEl.textContent = this.formatTime(duration);
                }
            } catch (error) {
                // Ignore errors, keep --:--
            }
        }
    }

    getAudioDuration(file) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
            });
            audio.addEventListener('error', reject);
            audio.src = URL.createObjectURL(file);
        });
    }

    openSettings() {
        this.settingsModal.style.display = 'flex';
        this.updateSettingsUI();
    }

    closeSettings() {
        this.settingsModal.style.display = 'none';
    }

    resetSettings() {
        this.settings = {
            theme: 'default',
            audioQuality: 'high',
            autoPlayNext: true,
            buttonSounds: true,
            showVisualizer: true,
            sleepTimer: 0,
            eqPreset: 'flat'
        };
        this.applySettings();
        localStorage.removeItem('pixelDSSettings');
    }

    saveCurrentSettings() {
        this.saveSettings();
        this.closeSettings();
        
        // Show confirmation
        const originalText = this.saveSettingsBtn.textContent;
        this.saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            this.saveSettingsBtn.textContent = originalText;
        }, 1000);
    }

    applyEqualizer() {
        // Basic EQ presets (would need Web Audio API for real implementation)
        const presets = {
            flat: [0, 0, 0, 0, 0],
            rock: [4, 2, -1, 1, 3],
            pop: [2, 1, 0, 1, 2],
            jazz: [2, 0, 1, 1, 2],
            classical: [3, 2, 0, 2, 3]
        };
        
        // This is a simplified version - real EQ would require AudioContext
        console.log(`Applied EQ preset: ${this.settings.eqPreset}`);
    }

    async loadFiles(event) {
        const files = Array.from(event.target.files);
        this.playlist = files.filter(file => file.type.startsWith('audio/'));
        
        if (this.playlist.length > 0) {
            // Extract metadata for all files
            await this.extractMetadataForPlaylist();
            this.currentTrackIndex = 0;
            this.loadCurrentTrack();
            this.updatePlaylistDisplay();
        }
    }

    async loadFolder(event) {
        const files = Array.from(event.target.files);
        this.playlist = files.filter(file => file.type.startsWith('audio/'));
        
        if (this.playlist.length > 0) {
            // Extract metadata for all files
            await this.extractMetadataForPlaylist();
            this.currentTrackIndex = 0;
            this.loadCurrentTrack();
            this.updatePlaylistDisplay();
        }
    }

    async extractMetadataForPlaylist() {
        // Extract metadata for first 10 files immediately, rest in background
        const priorityFiles = this.playlist.slice(0, 10);
        const backgroundFiles = this.playlist.slice(10);
        
        // Process priority files
        for (const file of priorityFiles) {
            await this.extractMetadata(file);
        }
        
        // Process background files asynchronously
        setTimeout(async () => {
            for (const file of backgroundFiles) {
                await this.extractMetadata(file);
                // Update playlist display if it's open
                if (this.playlistModal.classList.contains('show')) {
                    this.updatePlaylistDisplay();
                }
            }
        }, 100);
    }

    async extractMetadata(file) {
        if (this.metadataCache.has(file.name)) {
            return this.metadataCache.get(file.name);
        }

        const metadata = {
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            albumArt: null
        };

        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const id3Data = this.parseID3(arrayBuffer);
            
            if (id3Data) {
                metadata.title = id3Data.title || metadata.title;
                metadata.artist = id3Data.artist || metadata.artist;
                metadata.album = id3Data.album || metadata.album;
                metadata.albumArt = id3Data.albumArt || null;
            }
        } catch (error) {
            console.log('Failed to extract metadata for:', file.name);
            // Fallback to filename parsing
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            const parts = nameWithoutExt.split(' - ');
            
            if (parts.length >= 2) {
                metadata.artist = parts[0];
                metadata.title = parts.slice(1).join(' - ');
            }
        }

        this.metadataCache.set(file.name, metadata);
        return metadata;
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    parseID3(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        
        // Check for ID3v2 header
        if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
            return this.parseID3v2(view);
        }
        
        // Check for ID3v1 at end of file
        const id3v1Offset = arrayBuffer.byteLength - 128;
        if (id3v1Offset > 0 && 
            view.getUint8(id3v1Offset) === 0x54 && 
            view.getUint8(id3v1Offset + 1) === 0x41 && 
            view.getUint8(id3v1Offset + 2) === 0x47) {
            return this.parseID3v1(view, id3v1Offset);
        }
        
        return null;
    }

    parseID3v2(view) {
        const metadata = {};
        
        // Get tag size
        const tagSize = (view.getUint8(6) << 21) | 
                      (view.getUint8(7) << 14) | 
                      (view.getUint8(8) << 7) | 
                      view.getUint8(9);
        
        let offset = 10;
        
        while (offset < tagSize + 10) {
            // Read frame header
            const frameId = String.fromCharCode(
                view.getUint8(offset),
                view.getUint8(offset + 1),
                view.getUint8(offset + 2),
                view.getUint8(offset + 3)
            );
            
            if (frameId === '\0\0\0\0') break;
            
            const frameSize = view.getUint32(offset + 4);
            const frameData = offset + 10;
            
            // Skip encoding byte
            let textStart = frameData + 1;
            
            switch (frameId) {
                case 'TIT2': // Title
                    metadata.title = this.readString(view, textStart, frameSize - 1);
                    break;
                case 'TPE1': // Artist
                    metadata.artist = this.readString(view, textStart, frameSize - 1);
                    break;
                case 'TALB': // Album
                    metadata.album = this.readString(view, textStart, frameSize - 1);
                    break;
                case 'APIC': // Album art
                    metadata.albumArt = this.extractAlbumArt(view, frameData, frameSize);
                    break;
            }
            
            offset += 10 + frameSize;
        }
        
        return metadata;
    }

    parseID3v1(view, offset) {
        return {
            title: this.readString(view, offset + 3, 30).trim(),
            artist: this.readString(view, offset + 33, 30).trim(),
            album: this.readString(view, offset + 63, 30).trim(),
            albumArt: null
        };
    }

    readString(view, offset, length) {
        let result = '';
        for (let i = 0; i < length; i++) {
            const byte = view.getUint8(offset + i);
            if (byte === 0) break;
            result += String.fromCharCode(byte);
        }
        return result;
    }

    extractAlbumArt(view, offset, frameSize) {
        try {
            // Skip text encoding
            let pos = offset + 1;
            
            // Skip MIME type (null terminated)
            while (pos < offset + frameSize && view.getUint8(pos) !== 0) pos++;
            pos++; // Skip null terminator
            
            // Skip picture type
            pos++;
            
            // Skip description (null terminated)
            while (pos < offset + frameSize && view.getUint8(pos) !== 0) pos++;
            pos++; // Skip null terminator
            
            // Remaining data is the image
            const imageSize = frameSize - (pos - offset);
            const imageData = new Uint8Array(view.buffer, pos, imageSize);
            
            // Create blob URL
            const blob = new Blob([imageData], { type: 'image/jpeg' });
            return URL.createObjectURL(blob);
        } catch (error) {
            console.log('Failed to extract album art:', error);
            return null;
        }
    }

    async loadCurrentTrack() {
        if (this.playlist.length === 0) return;
        
        const file = this.playlist[this.currentTrackIndex];
        const url = URL.createObjectURL(file);
        
        try {
            this.audioPlayer.src = url;
            
            // Get metadata and update UI
            const metadata = await this.extractMetadata(file);
            this.updateTrackInfo(metadata);
            this.updateAlbumArt(metadata.albumArt);
            this.updatePlaylistDisplay();
            
            if (this.isPlaying) {
                await this.audioPlayer.play();
            }
        } catch (error) {
            console.log('Failed to load track:', error.message);
            // Clean up the URL object to prevent memory leaks
            URL.revokeObjectURL(url);
            
            // Reset UI to safe state
            this.isPlaying = false;
            this.playBtn.textContent = '▶️';
            this.visualizer.classList.remove('playing');
            
            // If this was an auto-advance, try the next track
            if (this.settings.autoPlayNext && this.playlist.length > 1) {
                setTimeout(() => {
                    this.nextTrack();
                }, 100);
            }
        }
    }

    updateTrackInfo(metadata) {
        this.trackTitle.textContent = metadata.title;
        
        // Create artist text with album if available
        let artistText = metadata.artist;
        if (metadata.album && metadata.album !== 'Unknown Album') {
            artistText = `${metadata.artist} • ${metadata.album}`;
        }
        
        // Check if text needs scrolling
        this.setupScrollingText(this.trackArtist, artistText);
    }

    setupScrollingText(element, text) {
        // Reset element
        element.classList.remove('scrolling');
        element.innerHTML = '';
        element.textContent = text;
        
        // Force layout calculation
        element.offsetWidth;
        
        // Check if text overflows
        const containerWidth = element.offsetWidth;
        const textWidth = element.scrollWidth;
        
        if (textWidth > containerWidth) {
            // Text overflows, setup scrolling
            element.classList.add('scrolling');
            element.innerHTML = `<span class="track-artist-text">${text}</span>`;
        } else {
            // Text fits, display normally
            element.textContent = text;
        }
    }

    updateAlbumArt(albumArtUrl) {
        const albumArt = document.querySelector('.album-art');
        
        if (albumArtUrl) {
            albumArt.style.backgroundImage = `url(${albumArtUrl})`;
            albumArt.style.backgroundSize = 'cover';
            albumArt.style.backgroundPosition = 'center';
            albumArt.style.imageRendering = 'pixelated';
            // Hide the mascot when showing album art
            this.mascot.style.display = 'none';
        } else {
            albumArt.style.backgroundImage = '';
            this.mascot.style.display = 'block';
        }
    }

    seekTo(event) {
        if (!this.audioPlayer.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.audioPlayer.currentTime = this.audioPlayer.duration * percent;
    }

    setVolume(event) {
        const rect = this.volumeBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.volume = Math.max(0, Math.min(1, percent));
        this.audioPlayer.volume = this.volume;
        this.updateVolumeDisplay();
    }

    updateProgress() {
        if (!this.audioPlayer.duration) return;
        
        const percent = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
        this.progressFill.style.width = `${percent}%`;
        this.progressHandle.style.left = `${percent}%`;
        
        this.currentTimeEl.textContent = this.formatTime(this.audioPlayer.currentTime);
    }

    updateVolumeDisplay() {
        const percent = this.volume * 100;
        this.volumeFill.style.width = `${percent}%`;
        this.volumeHandle.style.left = `${percent}%`;
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.querySelector('.time').textContent = timeString;
        
        setTimeout(() => this.updateTime(), 1000);
    }

    onTrackEnd() {
        if (!this.isLooped && this.settings.autoPlayNext) {
            this.nextTrack();
        }
    }

    onTrackLoaded() {
        this.totalTimeEl.textContent = this.formatTime(this.audioPlayer.duration);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    setupEasterEgg() {
        let tapCount = 0;
        const resetTime = 2000; // Reset after 2 seconds
        
        document.querySelector('.ds-top-screen').addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if clicked in top-left corner
            if (x < 40 && y < 40) {
                tapCount++;
                
                if (tapCount >= 3) {
                    this.triggerEasterEgg();
                    tapCount = 0;
                } else {
                    setTimeout(() => { tapCount = 0; }, resetTime);
                }
            }
        });
    }

    triggerEasterEgg() {
        this.easterEggCount++;
        const counter = document.getElementById('easterEggCounter');
        counter.textContent = `Easter Eggs: ${this.easterEggCount}`;
        counter.style.display = 'block';
        
        // Play special sound effect
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Dragon roar-like sound
        oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);
        
        // Hide counter after 3 seconds
        setTimeout(() => {
            counter.style.display = 'none';
        }, 3000);
        
        // Special mascot animation
        this.mascot.style.animation = 'bounce 0.5s infinite';
        setTimeout(() => {
            this.mascot.style.animation = '';
        }, 2000);
    }

    toggleSleepMode() {
        this.isSleepMode = !this.isSleepMode;
        document.querySelector('.ds-container').classList.toggle('sleep-mode', this.isSleepMode);
        
        if (this.isSleepMode && this.isPlaying) {
            this.audioPlayer.pause();
            this.playBtn.textContent = '▶️';
            this.visualizer.classList.remove('playing');
            this.isPlaying = false;
        }
    }

    saveSettings() {
        localStorage.setItem('pixelDSSettings', JSON.stringify(this.settings));
    }

    saveCurrentSettings() {
        this.saveSettings();
        this.closeSettings();
        
        // Show confirmation
        const originalText = this.saveSettingsBtn.textContent;
        this.saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            this.saveSettingsBtn.textContent = originalText;
        }, 1000);
    }
}

// Initialize the player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PixelDSPlayer();
});