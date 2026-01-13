// ========================================
// WhatsApp Chat Viewer - Main Script
// ========================================

class WhatsAppChatViewer {
    constructor() {
        // DOM Elements
        this.uploadScreen = document.getElementById('upload-screen');
        this.chatScreen = document.getElementById('chat-screen');
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.chatMessages = document.getElementById('chat-messages');
        this.backBtn = document.getElementById('back-btn');
        this.switchViewBtn = document.getElementById('switch-view-btn');
        this.chatName = document.getElementById('chat-name');
        this.messageCount = document.getElementById('message-count');
        this.avatarInitial = document.getElementById('avatar-initial');
        this.currentViewName = document.getElementById('current-view-name');
        this.scrollTopBtn = document.getElementById('scroll-top-btn');
        this.scrollBottomBtn = document.getElementById('scroll-bottom-btn');

        // New DOM Elements for starring and calendar
        this.starredFilterBtn = document.getElementById('starred-filter-btn');
        this.calendarBtn = document.getElementById('calendar-btn');
        this.datePickerModal = document.getElementById('date-picker-modal');
        this.closeDatePickerBtn = document.getElementById('close-date-picker');
        this.dateList = document.getElementById('date-list');

        // Starred messages modal
        this.starredMessagesModal = document.getElementById('starred-messages-modal');
        this.closeStarredModalBtn = document.getElementById('close-starred-modal');
        this.starredList = document.getElementById('starred-list');

        // Floating date bubble
        this.floatingDateBubble = document.getElementById('floating-date-bubble');
        this.scrollTimeout = null;

        // PDF Download button
        this.downloadPdfBtn = document.getElementById('download-pdf-btn');

        // AI Chat elements
        this.aiChatBtn = document.getElementById('ai-chat-btn');
        this.aiChatModal = document.getElementById('ai-chat-modal');
        this.closeAiModalBtn = document.getElementById('close-ai-modal');
        this.aiSetup = document.getElementById('ai-setup');
        this.aiChatInterface = document.getElementById('ai-chat-interface');
        this.geminiApiKeyInput = document.getElementById('gemini-api-key');
        this.saveApiKeyBtn = document.getElementById('save-api-key');
        this.aiMessages = document.getElementById('ai-messages');
        this.aiUserInput = document.getElementById('ai-user-input');
        this.aiSendBtn = document.getElementById('ai-send-btn');
        this.aiChatPartner = document.getElementById('ai-chat-partner');
        this.changeApiKeyBtn = document.getElementById('change-api-key-btn');

        // State
        this.messages = [];
        this.participants = [];
        this.currentViewIndex = 0;
        this.starredMessages = new Set(); // Store starred message IDs
        this.showStarredOnly = false; // Filter mode
        this.chatId = null; // Unique ID for current chat (for localStorage)

        // Virtual scrolling for performance
        this.CHUNK_SIZE = 50; // Number of messages to render at a time
        this.renderedRange = { start: 0, end: 0 };
        this.isLoadingMore = false;

        // AI state
        this.geminiApiKey = localStorage.getItem('gemini_api_key') || '';
        this.aiConversationHistory = [];

        // External link modal elements
        this.externalLinkModal = document.getElementById('external-link-modal');
        this.externalLinkUrl = document.getElementById('external-link-url');
        this.closeExternalLinkBtn = document.getElementById('close-external-link-modal');
        this.cancelExternalLinkBtn = document.getElementById('cancel-external-link');
        this.continueExternalLinkBtn = document.getElementById('continue-external-link');
        this.dontWarnAgainCheckbox = document.getElementById('dont-warn-again');

        // Security state
        this.skipExternalLinkWarning = false;
        this.pendingExternalUrl = null;
        this.MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB limit for ZIPs with media

        // Initialize
        this.bindEvents();
    }

    bindEvents() {
        // Upload area click
        this.uploadArea.addEventListener('click', () => this.fileInput.click());

        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('drag-over');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('drag-over');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        // Back button
        this.backBtn.addEventListener('click', () => this.showUploadScreen());

        // Switch view button
        this.switchViewBtn.addEventListener('click', () => this.switchView());

        // Download PDF button
        this.downloadPdfBtn.addEventListener('click', () => this.downloadAsPDF());

        // Scroll buttons
        this.scrollTopBtn.addEventListener('click', () => this.scrollToTop());
        this.scrollBottomBtn.addEventListener('click', () => this.scrollToBottom());

        // Update scroll button visibility and floating date bubble on scroll
        this.chatMessages.addEventListener('scroll', () => {
            this.updateScrollButtonVisibility();
            this.updateFloatingDateBubble();
        });

        // Starred filter button - now opens starred messages modal
        this.starredFilterBtn.addEventListener('click', () => this.openStarredMessagesModal());

        // Calendar button
        this.calendarBtn.addEventListener('click', () => this.openDatePicker());

        // Date picker modal close
        this.closeDatePickerBtn.addEventListener('click', () => this.closeDatePicker());
        this.datePickerModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeDatePicker());

        // Starred messages modal close
        this.closeStarredModalBtn.addEventListener('click', () => this.closeStarredMessagesModal());
        this.starredMessagesModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeStarredMessagesModal());

        // AI Chat events
        this.aiChatBtn.addEventListener('click', () => this.openAiChat());
        this.closeAiModalBtn.addEventListener('click', () => this.closeAiChat());
        this.aiChatModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeAiChat());
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.aiSendBtn.addEventListener('click', () => this.sendAiMessage());
        this.changeApiKeyBtn.addEventListener('click', () => this.resetApiKey());
        this.aiUserInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendAiMessage();
        });

        // AI suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.aiUserInput.value = btn.textContent;
                this.sendAiMessage();
            });
        });

        // External link modal events
        this.closeExternalLinkBtn.addEventListener('click', () => this.closeExternalLinkModal());
        this.cancelExternalLinkBtn.addEventListener('click', () => this.closeExternalLinkModal());
        this.continueExternalLinkBtn.addEventListener('click', () => this.proceedToExternalLink());
        this.externalLinkModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeExternalLinkModal());
    }

    scrollToTop() {
        this.chatMessages.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    scrollToBottom() {
        this.chatMessages.scrollTo({
            top: this.chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }

    updateScrollButtonVisibility() {
        const scrollTop = this.chatMessages.scrollTop;
        const scrollHeight = this.chatMessages.scrollHeight;
        const clientHeight = this.chatMessages.clientHeight;

        // Show/hide top button based on scroll position
        if (scrollTop > 100) {
            this.scrollTopBtn.classList.remove('hidden');
        } else {
            this.scrollTopBtn.classList.add('hidden');
        }

        // Show/hide bottom button based on scroll position
        if (scrollTop < scrollHeight - clientHeight - 100) {
            this.scrollBottomBtn.classList.remove('hidden');
        } else {
            this.scrollBottomBtn.classList.add('hidden');
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        // Security: Check file size (2GB limit for ZIPs with media)
        if (file.size > this.MAX_FILE_SIZE) {
            alert(`File too large! Maximum allowed size is 2GB. Your file is ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB.`);
            return;
        }

        const fileName = file.name.toLowerCase();

        // Security: Validate MIME type
        if (fileName.endsWith('.zip')) {
            if (!this.validateFileMimeType(file, 'zip')) {
                alert('Invalid file type! The file does not appear to be a valid ZIP archive.');
                return;
            }
            this.processZipFile(file);
        } else if (fileName.endsWith('.txt')) {
            if (!this.validateFileMimeType(file, 'txt')) {
                alert('Invalid file type! The file does not appear to be a valid text file.');
                return;
            }
            this.processTextFile(file);
        } else {
            alert('Please upload a .txt file or a .zip file containing the chat.');
        }
    }

    // Security: Validate file MIME type
    validateFileMimeType(file, expectedType) {
        const validMimeTypes = {
            'txt': ['text/plain', 'text/x-log', ''],  // Some browsers report empty for .txt
            'zip': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream', '']
        };

        return validMimeTypes[expectedType]?.includes(file.type) ?? false;
    }

    processTextFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.processContent(e.target.result);
        };
        reader.readAsText(file);
    }

    processZipFile(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(e.target.result);

                // Clear previous attachments to free memory
                this.revokeAttachmentUrls();
                this.attachments = new Map();

                // 1. Extract all media files first
                const mediaPromises = [];
                zipContent.forEach((relativePath, zipEntry) => {
                    if (zipEntry.dir) return;

                    const name = zipEntry.name.split('/').pop(); // Handle nested folders if any
                    const lowerName = name.toLowerCase();

                    // Check for supported media types
                    if (lowerName.match(/\.(jpg|jpeg|png|webp|gif|mp4)$/)) {
                        const promise = zipEntry.async('blob').then(blob => {
                            // Create object URL
                            const url = URL.createObjectURL(blob);
                            this.attachments.set(name, {
                                url: url,
                                type: lowerName.endsWith('.mp4') ? 'video' : 'image',
                                isSticker: lowerName.endsWith('.webp') // Typical for WhatsApp stickers
                            });
                        });
                        mediaPromises.push(promise);
                    }
                });

                // Wait for all media to be extracted
                await Promise.all(mediaPromises);
                console.log(`Extracted ${this.attachments.size} media files`);

                // 2. Find and process the chat text file
                const txtFileName = Object.keys(zipContent.files).find(name =>
                    name.toLowerCase().endsWith('.txt') && !name.startsWith('__MACOSX') && !name.startsWith('.')
                );

                if (txtFileName) {
                    const content = await zipContent.file(txtFileName).async('string');
                    this.processContent(content);
                } else {
                    alert('No .txt file found in the zip archive.');
                }
            } catch (err) {
                console.error('Error reading zip file:', err);
                alert('Failed to read the .zip file. Please valid zip file.');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    revokeAttachmentUrls() {
        if (this.attachments) {
            this.attachments.forEach(att => URL.revokeObjectURL(att.url));
            this.attachments.clear();
        }
    }

    async processContent(content) {
        // Security: Sanitize unicode characters before processing
        content = this.sanitizeUnicode(content);

        // Calculate Checksum for Data Integrity
        try {
            this.fileChecksum = await this.calculateChecksum(content);
        } catch (err) {
            console.error("Checksum failed", err);
            this.fileChecksum = "Error calculating checksum";
        }

        this.parseChat(content);
        this.showChatScreen();
    }

    // Security: Sanitize dangerous unicode characters
    sanitizeUnicode(text) {
        return text
            // Remove zero-width characters
            .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
            // Remove bidirectional override characters
            .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
            // Normalize unicode to NFKC form
            .normalize('NFKC');
    }

    // Security: Escape HTML to prevent XSS
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async calculateChecksum(text) {
        // Encode text to buffer
        const msgBuffer = new TextEncoder().encode(text);
        // Hash the buffer (SHA-256)
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        // Convert to Hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    parseChat(content) {
        this.messages = [];
        this.participants = new Set();
        let dateFormat = 'MDY'; // Default to MM/DD/YYYY

        // WhatsApp chat export format patterns
        const patterns = [
            // [DD/MM/YYYY, HH:MM:SS] Name: Message (No AM/PM, 24-hour)
            /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.*)$/i,
            // Format with brackets: [2/23/25, 11:14:51 AM] Name: message
            /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]\s*([^:]+):\s*(.*)$/i,
            // Format without brackets: 2/23/25, 11:14:51 AM - Name: message  
            /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*([^:]+):\s*(.*)$/i
        ];

        const lines = content.split('\n');

        // First pass: Detect date format to avoid confusion between MM/DD and DD/MM
        for (let line of lines) {
            // Remove LTR marks and trim
            line = line.replace(/^[\u200e\u200f]+/, '').trim();
            if (!line) continue;

            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    const dateStr = match[1];
                    const parts = dateStr.split('/');
                    const first = parseInt(parts[0]);
                    const second = parseInt(parts[1]);

                    // If first number > 12, it must be Day (DD/MM)
                    if (first > 12) {
                        dateFormat = 'DMY';
                        break;
                    }
                    // If second number > 12, and first <= 12, it's likely Month first (MM/DD)
                    else if (second > 12) {
                        dateFormat = 'MDY';
                        break;
                    }
                }
            }
            if (dateFormat === 'DMY') break; // Found conclusive evidence
        }

        console.log(`Detected date format: ${dateFormat}`);

        let currentMessage = null;

        for (let line of lines) {
            // Crucial: Strip invisible characters (LTR marks) that break regex anchors
            line = line.replace(/^[\u200e\u200f]+/, '').trim();

            if (!line) continue;

            let matched = false;

            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    // Save previous message if exists
                    if (currentMessage) {
                        this.messages.push(currentMessage);
                    }

                    const [, date, time, sender, text] = match;
                    const cleanSender = sender.trim();

                    // Check if this is a system message
                    const isSystemMessage = this.isSystemMessage(text);

                    if (!isSystemMessage) {
                        this.participants.add(cleanSender);
                    }

                    // Check for attachment in text
                    // Pattern 1: "filename.jpg (file attached)"
                    // Pattern 2: just "filename.jpg" (sometimes happens)
                    let attachment = null;
                    const attachmentMatch = text.match(/(.*?)\s*\(file attached\)$/);
                    const potentialFileName = attachmentMatch ? attachmentMatch[1] : text.trim();

                    // Try to find exact match in attachments map
                    if (this.attachments && this.attachments.has(potentialFileName)) {
                        attachment = this.attachments.get(potentialFileName);
                    }
                    // Try finding by just the filename if path exists
                    else if (this.attachments) {
                        // Sometimes text has "IMG-2023.jpg" but zip has "Start/IMG-2023.jpg"
                        // We already flattened names in processZipFile, so direct lookup should work
                        // unless text has extra words. 
                        // Let's also check if the text *contains* a known attachment name
                        for (const [name, data] of this.attachments.entries()) {
                            if (text.includes(name)) {
                                attachment = data;
                                break;
                            }
                        }
                    }

                    currentMessage = {
                        id: `msg_${this.messages.length}_${Date.now()}`,
                        date: date,
                        time: this.formatTime(time),
                        sender: cleanSender,
                        text: text, // Keep original text
                        isSystem: isSystemMessage,
                        fullDateTime: this.parseDateTime(date, time, dateFormat),
                        attachment: attachment // Add attachment data
                    };
                    matched = true;
                    break;
                }
            }

            // If no pattern matched and we have a current message, append as continuation
            if (!matched && currentMessage) {
                currentMessage.text += '\n' + line;
            }
        }

        // Don't forget the last message
        if (currentMessage) {
            this.messages.push(currentMessage);
        }

        // Convert participants Set to Array
        this.participants = Array.from(this.participants);

        // Sort messages by date/time
        this.messages.sort((a, b) => a.fullDateTime - b.fullDateTime);

        // Generate unique message IDs after sorting
        this.messages.forEach((msg, index) => {
            msg.id = `msg_${index}`;
        });

        // Generate chat ID and load starred messages
        this.chatId = this.generateChatId(content);
        this.loadStarredMessages();

        console.log(`Parsed ${this.messages.length} messages from ${this.participants.length} participants`);
    }

    parseDateTime(dateStr, timeStr, dateFormat = 'MDY') {
        try {
            // Parse date
            const dateParts = dateStr.split('/');
            let month, day;

            if (dateFormat === 'DMY') {
                day = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]) - 1;
            } else {
                month = parseInt(dateParts[0]) - 1;
                day = parseInt(dateParts[1]);
            }
            let year = parseInt(dateParts[2]);

            // Handle 2-digit year
            if (year < 100) {
                year += 2000;
            }

            // Parse time (handle AM/PM)
            let timeClean = timeStr.replace(/\s*(AM|PM)/i, '');
            let timeParts = timeClean.split(':');
            let hours = parseInt(timeParts[0]);
            let minutes = parseInt(timeParts[1]);
            let seconds = timeParts[2] ? parseInt(timeParts[2]) : 0;

            // Convert to 24-hour format
            if (timeStr.toUpperCase().includes('PM') && hours !== 12) {
                hours += 12;
            } else if (timeStr.toUpperCase().includes('AM') && hours === 12) {
                hours = 0;
            }

            return new Date(year, month, day, hours, minutes, seconds);
        } catch (e) {
            return new Date();
        }
    }

    formatTime(timeStr) {
        // Extract just HH:MM and AM/PM
        const match = timeStr.match(/(\d{1,2}:\d{2})(?::\d{2})?\s*(AM|PM)?/i);
        if (match) {
            return match[1] + (match[2] ? ' ' + match[2].toUpperCase() : '');
        }
        return timeStr;
    }

    isSystemMessage(text) {
        const systemPatterns = [
            /^‎.*is a contact$/i,
            /^‎?Messages and calls are end-to-end encrypted/i,
            /^‎?You created group/i,
            /^‎?.*added you$/i,
            /^‎?.*left$/i,
            /^‎?.*joined/i,
            /^‎?.*changed the subject/i,
            /^‎?.*changed this group's icon/i,
            /^‎?.*changed the group description/i,
            /^‎?This message was deleted/i,
            /^‎?You deleted this message/i,
            /^<Media omitted>$/i,
            /^‎?.*'s security code changed/i
        ];

        return systemPatterns.some(pattern => pattern.test(text));
    }

    showChatScreen() {
        this.uploadScreen.classList.add('hidden');
        this.chatScreen.classList.remove('hidden');

        // Update header info
        if (this.participants.length >= 2) {
            // Show the other person's name in the header (not current viewer)
            const otherParticipant = this.participants[(this.currentViewIndex + 1) % this.participants.length];
            this.chatName.textContent = otherParticipant;
            this.avatarInitial.textContent = otherParticipant.charAt(0).toUpperCase();
            this.currentViewName.textContent = this.participants[this.currentViewIndex];
        } else if (this.participants.length === 1) {
            this.chatName.textContent = this.participants[0];
            this.avatarInitial.textContent = this.participants[0].charAt(0).toUpperCase();
            this.currentViewName.textContent = this.participants[0];
        }

        this.messageCount.textContent = `${this.messages.length} messages`;

        // Add checksum info to tooltip
        if (this.fileChecksum) {
            this.messageCount.title = `File Checksum (SHA-256):\n${this.fileChecksum}`;
            this.messageCount.style.cursor = 'help';
        }

        this.renderMessages();
    }

    showUploadScreen() {
        this.chatScreen.classList.add('hidden');
        this.uploadScreen.classList.remove('hidden');
        this.fileInput.value = '';
        this.messages = [];
        this.participants = [];
        this.currentViewIndex = 0;
    }

    switchView() {
        if (this.participants.length < 2) return;

        this.currentViewIndex = (this.currentViewIndex + 1) % this.participants.length;

        // Update header to show the other person
        const otherParticipant = this.participants[(this.currentViewIndex + 1) % this.participants.length];
        this.chatName.textContent = otherParticipant;
        this.avatarInitial.textContent = otherParticipant.charAt(0).toUpperCase();
        this.currentViewName.textContent = this.participants[this.currentViewIndex];

        this.renderMessages();

        // Add a small animation feedback (scale like other buttons)
        this.switchViewBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.switchViewBtn.style.transform = 'scale(1)';
        }, 150);
    }

    renderMessages() {
        this.chatMessages.innerHTML = '';

        const currentViewer = this.participants[this.currentViewIndex];

        // Filter messages if starred filter is active
        let messagesToRender = this.messages;
        if (this.showStarredOnly) {
            messagesToRender = this.messages.filter(m => this.starredMessages.has(m.id));
        }

        // Show no results if filter returns empty
        if (messagesToRender.length === 0 && this.showStarredOnly) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <p>No starred messages yet.<br>Tap the star icon on any message to star it.</p>
            `;
            this.chatMessages.appendChild(noResults);
            return;
        }

        // Store filtered messages for chunked loading
        this.filteredMessages = messagesToRender;

        // Calculate initial range (show last CHUNK_SIZE messages)
        const totalMessages = messagesToRender.length;
        this.renderedRange = {
            start: Math.max(0, totalMessages - this.CHUNK_SIZE),
            end: totalMessages
        };

        // Add "Load older messages" button if there are more messages
        if (this.renderedRange.start > 0) {
            this.addLoadOlderButton();
        }

        // Render the chunk
        this.renderMessageChunk(this.renderedRange.start, this.renderedRange.end, currentViewer);

        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // Update scroll button visibility
        setTimeout(() => this.updateScrollButtonVisibility(), 100);
    }

    renderMessageChunk(start, end, currentViewer, appendAtEnd = false) {
        let currentDate = null;

        // Get previous date if not starting from beginning
        if (start > 0 && this.filteredMessages[start - 1]) {
            currentDate = this.filteredMessages[start - 1].date;
        }

        const fragment = document.createDocumentFragment();

        for (let i = start; i < end; i++) {
            const message = this.filteredMessages[i];

            // Add date separator if date changed
            if (message.date !== currentDate) {
                currentDate = message.date;
                const dateSeparator = this.createDateSeparator(message.date, message.fullDateTime);
                fragment.appendChild(dateSeparator);
            }

            // Render message
            if (message.isSystem) {
                if (!this.showStarredOnly) {
                    const systemMsg = this.createSystemMessage(message.text);
                    fragment.appendChild(systemMsg);
                }
            } else {
                const isOutgoing = message.sender === currentViewer;
                const msgElement = this.createMessageBubble(message, isOutgoing);
                fragment.appendChild(msgElement);
            }
        }

        // Handle insertion based on IDs
        const loadOlderBtn = this.chatMessages.querySelector('#load-more-btn-older');
        const loadNewerBtn = this.chatMessages.querySelector('#load-more-btn-newer'); // We don't really insert before newer, but good to know

        // This function is generally used for initial render or render-after-reset.
        // If we are just appending:
        if (appendAtEnd) {
            this.chatMessages.appendChild(fragment);
        } else if (loadOlderBtn && loadOlderBtn.nextSibling) {
            // If we have an older button, we likely want to insert after it
            this.chatMessages.insertBefore(fragment, loadOlderBtn.nextSibling);
        } else if (loadOlderBtn) {
            this.chatMessages.appendChild(fragment);
        } else if (loadNewerBtn) {
            // If we have a newer button, we are likely rendering the main chunk, so insert before it?
            // Actually renderMessageChunk is generic.
            // If we are calling from scrollToDate, we cleared innerHTML.
            // If we are calling from loadNewerMessages, it just appends.
            this.chatMessages.insertBefore(fragment, loadNewerBtn);
        } else {
            this.chatMessages.appendChild(fragment);
        }
    }

    loadOlderMessages() {
        if (this.isLoadingMore) return;
        this.isLoadingMore = true;

        const currentViewer = this.participants[this.currentViewIndex];
        const prevScrollHeight = this.chatMessages.scrollHeight;

        // Calculate new range
        const newStart = Math.max(0, this.renderedRange.start - this.CHUNK_SIZE);
        const newEnd = this.renderedRange.start;

        // Remove old load-more button
        const oldLoadBtn = this.chatMessages.querySelector('#load-more-btn-older');
        if (oldLoadBtn) oldLoadBtn.remove();

        // Use a fragment to hold the new older messages
        // BUT we need to create the button too.

        // Create fragment for new messages
        let currentDate = null;
        if (newStart > 0 && this.filteredMessages[newStart - 1]) {
            currentDate = this.filteredMessages[newStart - 1].date;
        }

        const fragment = document.createDocumentFragment();

        // Add new "Load more" button if still more messages
        if (newStart > 0) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.id = 'load-more-btn-older';
            loadMoreBtn.innerHTML = `
                <button>Load ${Math.min(this.CHUNK_SIZE, newStart)} older messages</button>
                <span class="remaining-count">${newStart} messages above</span>
            `;
            loadMoreBtn.querySelector('button').addEventListener('click', () => this.loadOlderMessages());
            fragment.appendChild(loadMoreBtn);
        }

        for (let i = newStart; i < newEnd; i++) {
            const message = this.filteredMessages[i];

            if (message.date !== currentDate) {
                currentDate = message.date;
                const dateSeparator = this.createDateSeparator(message.date, message.fullDateTime);
                fragment.appendChild(dateSeparator);
            }

            if (message.isSystem) {
                if (!this.showStarredOnly) {
                    const systemMsg = this.createSystemMessage(message.text);
                    fragment.appendChild(systemMsg);
                }
            } else {
                const isOutgoing = message.sender === currentViewer;
                const msgElement = this.createMessageBubble(message, isOutgoing);
                fragment.appendChild(msgElement);
            }
        }

        // Insert at the beginning
        this.chatMessages.insertBefore(fragment, this.chatMessages.firstChild);

        // Maintain scroll position
        const newScrollHeight = this.chatMessages.scrollHeight;
        this.chatMessages.scrollTop = newScrollHeight - prevScrollHeight;

        // Update range
        this.renderedRange.start = newStart;

        this.isLoadingMore = false;
    }

    createDateSeparator(dateStr, dateObj) {
        const div = document.createElement('div');
        div.className = 'date-separator';

        const span = document.createElement('span');
        span.textContent = this.formatDateForSeparator(dateObj);

        div.appendChild(span);
        return div;
    }

    formatDateForSeparator(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (messageDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (messageDate.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else {
            // Check if within last 7 days
            const daysDiff = Math.floor((today - messageDate) / (1000 * 60 * 60 * 24));
            if (daysDiff < 7) {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return days[date.getDay()];
            } else {
                // Full date
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                return date.toLocaleDateString('en-US', options);
            }
        }
    }

    createSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'system-message';

        const span = document.createElement('span');
        // Clean up the text (remove special characters)
        span.textContent = text.replace(/^‎/, '').trim();

        div.appendChild(span);
        return div;
    }

    updateFloatingDateBubble() {
        // Show bubble
        this.floatingDateBubble.classList.remove('hidden');

        // Clear existing timeout
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        // Set timeout to hide bubble after 1.5s of no scrolling
        this.scrollTimeout = setTimeout(() => {
            this.floatingDateBubble.classList.add('hidden');
        }, 1500);

        // Find the top-most visible message
        // We'll check elements until we find one that has a positive top relative to the container
        const containerRect = this.chatMessages.getBoundingClientRect();
        const messages = this.chatMessages.querySelectorAll('.message');

        // Binary search or simple iteration - iteration is fine for visible viewport
        // Actually, getting element from point is efficient
        // We look at a point just inside the top of the container

        let foundDate = null;

        // Strategy: Check multiple points to ensure we hit a message bubble regardless of alignment
        const containerTop = containerRect.top;
        const checkY = containerTop + 50; // 50px from top

        let messageElement = null;

        // Define check points (left, center, right)
        const checkXs = [
            containerRect.left + 50,                  // Left (Incoming)
            containerRect.left + containerRect.width / 2, // Center (System/Date)
            containerRect.right - 50                  // Right (Outgoing)
        ];

        for (const x of checkXs) {
            const element = document.elementFromPoint(x, checkY);
            if (element) {
                const bubble = element.closest('.message');
                if (bubble) {
                    messageElement = bubble;
                    break;
                }
            }
        }

        // Fallback: if no message found at 50px, try a bit lower (120px)
        if (!messageElement) {
            for (const x of checkXs) {
                const element = document.elementFromPoint(x, checkY + 70);
                if (element) {
                    const bubble = element.closest('.message');
                    if (bubble) {
                        messageElement = bubble;
                        break;
                    }
                }
            }
        }

        if (messageElement && messageElement.dataset.date) {
            const dateStr = messageElement.dataset.date;
            const dateObj = new Date(dateStr);
            const formattedDate = this.formatDateForSeparator(dateObj);

            // Only update if text changed
            const span = this.floatingDateBubble.querySelector('span');
            if (span.textContent !== formattedDate) {
                span.textContent = formattedDate;
            }
        }
    }

    createMessageBubble(message, isOutgoing) {
        const div = document.createElement('div');
        div.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        div.dataset.messageId = message.id;
        div.dataset.date = message.fullDateTime; // Store full date string for parsing later

        // Star button
        const starBtn = document.createElement('button');
        starBtn.className = `message-star ${this.starredMessages.has(message.id) ? 'starred' : ''}`;
        starBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
        `;
        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleStar(message.id, starBtn);
        });
        div.appendChild(starBtn);

        // Sender name (only for incoming)
        if (!isOutgoing) {
            const senderDiv = document.createElement('div');
            senderDiv.className = 'message-sender';
            senderDiv.textContent = message.sender;
            div.appendChild(senderDiv);
        }

        // Message text with link detection
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';

        // Render Attachment if exists
        if (message.attachment) {
            const mediaContainer = document.createElement('div');
            mediaContainer.className = 'message-media';

            if (message.attachment.type === 'image') {
                const img = document.createElement('img');
                img.src = message.attachment.url;
                img.loading = 'lazy';
                if (message.attachment.isSticker) {
                    img.className = 'media-sticker';
                    // Stickers usually don't have text, but if they do, we show it below
                } else {
                    img.className = 'media-image';
                }
                // Add click to view full size (simple implementation)
                img.onclick = () => window.open(img.src, '_blank');
                mediaContainer.appendChild(img);
            } else if (message.attachment.type === 'video') {
                const video = document.createElement('video');
                video.src = message.attachment.url;
                video.controls = true;
                video.className = 'media-video';
                mediaContainer.appendChild(video);
            }

            div.appendChild(mediaContainer);
        }

        // Text visibility logic
        let showText = true;
        if (message.attachment) {
            // ALWAYS hide text for stickers unless it's explicitly different? 
            // Usually stickers have no caption in WhatsApp. 
            // If the text is just the filename or the "attached" marker, hide it.
            if (message.attachment.isSticker) {
                showText = false;
            } else {
                // For images/videos, check if text is just metadata
                const text = message.text.trim();
                const isFilename = text.includes(message.attachment.name);
                const isAttachedMarker = text.includes('(file attached)') || text.toLowerCase().startsWith('<attached:');

                // If the text is JUST the filename/marker, hide it. 
                // We want to keep real captions (e.g. "Look at this cat! IMG001.jpg (file attached)")
                // But usually the export is just "IMG001.jpg (file attached)"
                if (isFilename || isAttachedMarker) {
                    // Check if there's other content
                    const cleanText = text
                        .replace(message.attachment.name, '')
                        .replace('(file attached)', '')
                        .replace(/<attached:.*?>/i, '')
                        .trim();

                    if (cleanText.length === 0) {
                        showText = false;
                    }
                }
            }
        }

        if (showText) {
            textDiv.innerHTML = this.detectAndWrapLinks(message.text);
            div.appendChild(textDiv);
        }

        // Meta (time + status)
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = message.time;
        metaDiv.appendChild(timeSpan);

        // Add read status for outgoing messages
        if (isOutgoing) {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'message-status';
            statusDiv.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="10" viewBox="0 0 16 10">
                    <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M1.5 5.5l3.5 3.5 9-9"/>
                </svg>
            `;
            metaDiv.appendChild(statusDiv);
        }

        div.appendChild(metaDiv);

        return div;
    }

    // ========================================
    // Star Messages Feature
    // ========================================

    toggleStar(messageId, starBtn) {
        if (this.starredMessages.has(messageId)) {
            this.starredMessages.delete(messageId);
            starBtn.classList.remove('starred');
        } else {
            this.starredMessages.add(messageId);
            starBtn.classList.add('starred');
        }
        this.saveStarredMessages();
    }

    saveStarredMessages() {
        if (!this.chatId) return;
        const key = `whatsapp_starred_${this.chatId}`;
        localStorage.setItem(key, JSON.stringify([...this.starredMessages]));
    }

    loadStarredMessages() {
        if (!this.chatId) return;
        const key = `whatsapp_starred_${this.chatId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                this.starredMessages = new Set(JSON.parse(saved));
            } catch (e) {
                this.starredMessages = new Set();
            }
        }
    }

    toggleStarredFilter() {
        this.showStarredOnly = !this.showStarredOnly;

        if (this.showStarredOnly) {
            this.starredFilterBtn.classList.add('active');
        } else {
            this.starredFilterBtn.classList.remove('active');
        }

        this.renderMessages();
    }

    openStarredMessagesModal() {
        // Clear and populate starred list
        this.starredList.innerHTML = '';

        // Get starred messages
        const starredMessages = this.messages.filter(m => this.starredMessages.has(m.id));

        if (starredMessages.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <p>No starred messages yet.<br>Tap the star icon on any message to star it.</p>
            `;
            this.starredList.appendChild(noResults);
        } else {
            // Sort by date (newest first)
            starredMessages.sort((a, b) => b.fullDateTime - a.fullDateTime);

            for (const message of starredMessages) {
                const starredItem = document.createElement('div');
                starredItem.className = 'starred-item';
                starredItem.innerHTML = `
                    <div class="starred-item-header">
                        <span class="starred-item-sender">${message.sender}</span>
                        <span class="starred-item-date">${this.formatDateForSeparator(message.fullDateTime)} • ${message.time}</span>
                    </div>
                    <div class="starred-item-text">${message.text}</div>
                `;
                starredItem.addEventListener('click', () => {
                    this.closeStarredMessagesModal();
                    this.jumpToMessage(message.id);
                });
                this.starredList.appendChild(starredItem);
            }
        }

        this.starredMessagesModal.classList.remove('hidden');
    }

    closeStarredMessagesModal() {
        this.starredMessagesModal.classList.add('hidden');
    }

    jumpToMessage(messageId) {
        // First, make sure we're showing all messages (not filtered)
        if (this.showStarredOnly) {
            this.showStarredOnly = false;
            this.starredFilterBtn.classList.remove('active');
        }

        // Find the message index in the full message array
        const messageIndex = this.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        // Update filtered messages (in case filter was active)
        this.filteredMessages = this.messages;

        // Check if message is in the currently rendered range
        if (messageIndex >= this.renderedRange.start && messageIndex < this.renderedRange.end) {
            // Message is already rendered, just scroll to it
            this.scrollToAndHighlightMessage(messageId);
        } else {
            // Message is NOT rendered - need to load the chunk containing it
            const currentViewer = this.participants[this.currentViewIndex];

            // Calculate new range centered around the target message
            const halfChunk = Math.floor(this.CHUNK_SIZE / 2);
            const newStart = Math.max(0, messageIndex - halfChunk);
            const newEnd = Math.min(this.filteredMessages.length, newStart + this.CHUNK_SIZE);

            this.renderedRange.start = newStart;
            this.renderedRange.end = newEnd;

            // Clear and re-render
            this.chatMessages.innerHTML = '';

            // Add Load Older button if needed
            if (this.renderedRange.start > 0) {
                this.addLoadOlderButton();
            }

            // Render the chunk
            this.renderMessageChunk(this.renderedRange.start, this.renderedRange.end, currentViewer);

            // Add Load Newer button if needed
            if (this.renderedRange.end < this.filteredMessages.length) {
                this.addLoadNewerButton();
            }

            // Now scroll to the message
            setTimeout(() => {
                this.scrollToAndHighlightMessage(messageId);
            }, 100);
        }
    }

    scrollToAndHighlightMessage(messageId) {
        const messageElement = this.chatMessages.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add highlight animation
            messageElement.style.transition = 'background-color 0.3s ease';
            messageElement.style.backgroundColor = 'rgba(255, 193, 7, 0.3)';
            setTimeout(() => {
                messageElement.style.backgroundColor = '';
            }, 2000);
        }
    }

    // ========================================
    // Date Picker Feature
    // ========================================

    openDatePicker() {
        // Build date list from messages
        const dateMap = new Map();

        for (const message of this.messages) {
            if (!message.isSystem) {
                const dateKey = message.date;
                if (!dateMap.has(dateKey)) {
                    dateMap.set(dateKey, {
                        date: message.fullDateTime,
                        count: 0
                    });
                }
                dateMap.get(dateKey).count++;
            }
        }

        // Clear and populate date list
        this.dateList.innerHTML = '';

        // Sort dates newest first
        const sortedDates = [...dateMap.entries()].sort((a, b) => b[1].date - a[1].date);

        for (const [dateKey, data] of sortedDates) {
            const dateItem = document.createElement('div');
            dateItem.className = 'date-item';
            dateItem.innerHTML = `
                <span class="date-text">${this.formatDateForSeparator(data.date)}</span>
                <span class="message-count">${data.count} messages</span>
            `;
            dateItem.addEventListener('click', () => {
                this.closeDatePicker();
                this.scrollToDate(dateKey);
            });
            this.dateList.appendChild(dateItem);
        }

        this.datePickerModal.classList.remove('hidden');
    }

    closeDatePicker() {
        this.datePickerModal.classList.add('hidden');
    }

    scrollToDate(dateKey) {
        // Find the index of the first message with this date
        const messageIndex = this.filteredMessages.findIndex(m => m.date === dateKey);

        if (messageIndex === -1) {
            this.scrollToTop();
            return;
        }

        // Check if this message is currently rendered
        if (messageIndex >= this.renderedRange.start && messageIndex < this.renderedRange.end) {
            // It's rendered, just scroll to it
            const targetMessage = this.chatMessages.querySelector(`[data-message-id="${this.filteredMessages[messageIndex].id}"]`);
            if (targetMessage) {
                targetMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Also scroll slightly up to show the date separator if it exists
                const prevSibling = targetMessage.previousElementSibling;
                if (prevSibling && prevSibling.classList.contains('date-separator')) {
                    prevSibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        } else {
            // It's not rendered, need to load the chunk containing this message

            // Calculate new range to include this message plus CHUNK_SIZE
            const newStart = Math.max(0, messageIndex);
            // HUGE FIX: Limit the end range too, don't render until the end of time!
            const newEnd = Math.min(this.filteredMessages.length, newStart + this.CHUNK_SIZE);

            this.renderedRange.start = newStart;
            this.renderedRange.end = newEnd;

            // Clear current messages
            this.chatMessages.innerHTML = '';

            // Re-add Load Older button if needed
            if (this.renderedRange.start > 0) {
                this.addLoadOlderButton();
            }

            const currentViewer = this.participants[this.currentViewIndex];
            this.renderMessageChunk(this.renderedRange.start, this.renderedRange.end, currentViewer);

            // Add Load Newer button if not at the end
            if (this.renderedRange.end < this.filteredMessages.length) {
                this.addLoadNewerButton();
            }

            // Now scroll to the top of the loaded chunk (the target date)
            setTimeout(() => {
                const targetMessage = this.chatMessages.querySelector(`[data-message-id="${this.filteredMessages[messageIndex].id}"]`);
                if (targetMessage) {
                    targetMessage.scrollIntoView({ behavior: 'auto', block: 'start' });
                    // Also scroll slightly up to show the date separator if it exists
                    const prevSibling = targetMessage.previousElementSibling;
                    if (prevSibling && prevSibling.classList.contains('date-separator')) {
                        prevSibling.scrollIntoView({ behavior: 'auto', block: 'start' });
                    }
                }
            }, 50);
        }
    }

    addLoadOlderButton() {
        const loadMoreBtn = document.createElement('div');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.id = 'load-more-btn-older'; // ID changed to distinguish
        loadMoreBtn.innerHTML = `
            <button>Load ${Math.min(this.CHUNK_SIZE, this.renderedRange.start)} older messages</button>
            <span class="remaining-count">${this.renderedRange.start} messages above</span>
        `;
        loadMoreBtn.querySelector('button').addEventListener('click', () => this.loadOlderMessages());
        this.chatMessages.insertBefore(loadMoreBtn, this.chatMessages.firstChild);
    }

    addLoadNewerButton() {
        const remaining = this.filteredMessages.length - this.renderedRange.end;
        const loadMoreBtn = document.createElement('div');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.id = 'load-more-btn-newer';
        loadMoreBtn.style.marginTop = '16px';
        loadMoreBtn.innerHTML = `
            <button>Load ${Math.min(this.CHUNK_SIZE, remaining)} newer messages</button>
            <span class="remaining-count">${remaining} messages below</span>
        `;
        loadMoreBtn.querySelector('button').addEventListener('click', () => this.loadNewerMessages());
        this.chatMessages.appendChild(loadMoreBtn);
    }

    loadNewerMessages() {
        if (this.isLoadingMore) return;
        this.isLoadingMore = true;

        const currentViewer = this.participants[this.currentViewIndex];

        // Calculate new range
        const newStart = this.renderedRange.end;
        const newEnd = Math.min(this.filteredMessages.length, this.renderedRange.end + this.CHUNK_SIZE);

        // Remove old load-newer button
        const oldLoadBtn = this.chatMessages.querySelector('#load-more-btn-newer');
        if (oldLoadBtn) oldLoadBtn.remove();

        // Render new chunk
        this.renderMessageChunk(newStart, newEnd, currentViewer, true);

        // Update range
        this.renderedRange.end = newEnd;

        // Add new Load Newer button if still more messages
        if (this.renderedRange.end < this.filteredMessages.length) {
            this.addLoadNewerButton();
        }

        this.isLoadingMore = false;
    }

    generateChatId(content) {
        // Generate a simple hash from the first few messages
        let hash = 0;
        const sample = content.substring(0, 500);
        for (let i = 0; i < sample.length; i++) {
            const char = sample.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    downloadAsPDF() {
        // Show loading indicator
        const originalBtnContent = this.downloadPdfBtn.innerHTML;
        this.downloadPdfBtn.innerHTML = `<svg class="spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
        this.downloadPdfBtn.disabled = true;

        // Use async function for emoji loading
        this.generatePDFWithEmoji().then(() => {
            this.downloadPdfBtn.innerHTML = originalBtnContent;
            this.downloadPdfBtn.disabled = false;
        }).catch(err => {
            console.error('PDF generation failed:', err);
            alert('PDF generation failed. Try exporting as text instead.');
            this.downloadPdfBtn.innerHTML = originalBtnContent;
            this.downloadPdfBtn.disabled = false;
        });
    }

    // Convert emoji to Twemoji CDN URL (using GitHub assets path)
    emojiToTwemojiUrl(emoji) {
        const codePoints = [...emoji]
            .map(char => char.codePointAt(0).toString(16))
            .filter(cp => cp !== 'fe0f') // Remove variation selector
            .join('-');
        return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoints}.png`;
    }

    // Load image as base64 for jsPDF
    async loadImageAsBase64(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
    }

    // Extract emojis from text
    extractEmojis(text) {
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Component})/gu;
        const matches = text.match(emojiRegex) || [];
        return [...new Set(matches)]; // Unique emojis only
    }

    // Preload all emojis used in messages
    async preloadEmojis() {
        const allText = this.messages.map(m => m.text).join(' ');
        const emojis = this.extractEmojis(allText);

        const emojiCache = {};
        const loadPromises = emojis.map(async (emoji) => {
            const url = this.emojiToTwemojiUrl(emoji);
            const base64 = await this.loadImageAsBase64(url);
            if (base64) {
                emojiCache[emoji] = base64;
            }
        });

        await Promise.all(loadPromises);
        return emojiCache;
    }

    async generatePDFWithEmoji() {
        // Preload all emoji images
        const emojiCache = await this.preloadEmojis();
        const hasEmojis = Object.keys(emojiCache).length > 0;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        const bubbleWidth = (pageWidth - margin * 2) * 0.7;
        let yPosition = margin;
        const lineHeight = 4.5;
        const bubblePadding = 3;
        const bubbleMargin = 4;
        const emojiSize = 4; // mm

        const selfUser = this.participants[this.currentViewIndex];

        // Sanitize text for PDF (keep emojis as placeholders)
        const sanitizeText = (text) => {
            return text
                .replace(/[\u200e\u200f]/g, '')
                .replace(/[^\x00-\x7F\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu, '');
        };

        // Render text with inline emojis
        const renderTextWithEmoji = (text, x, y, maxWidth, fontSize) => {
            doc.setFontSize(fontSize);
            const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)/gu;

            // Split text into segments (text and emoji alternating)
            const segments = [];
            let lastIndex = 0;
            let match;

            while ((match = emojiRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
                }
                segments.push({ type: 'emoji', content: match[0] });
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < text.length) {
                segments.push({ type: 'text', content: text.slice(lastIndex) });
            }

            let currentX = x;
            let currentY = y;
            const charWidth = fontSize * 0.35; // Approximate char width in mm
            const lineHeightMm = fontSize * 0.4;

            for (const segment of segments) {
                if (segment.type === 'text') {
                    // Clean non-ASCII from text portions
                    const cleanText = segment.content.replace(/[^\x00-\x7F]/g, '');
                    if (cleanText) {
                        // Check if we need to wrap
                        const textWidth = doc.getTextWidth(cleanText);
                        if (currentX + textWidth > x + maxWidth) {
                            currentX = x;
                            currentY += lineHeightMm;
                        }
                        doc.text(cleanText, currentX, currentY);
                        currentX += textWidth;
                    }
                } else if (segment.type === 'emoji') {
                    const emojiData = emojiCache[segment.content];
                    if (emojiData) {
                        // Check if we need to wrap
                        if (currentX + emojiSize > x + maxWidth) {
                            currentX = x;
                            currentY += lineHeightMm;
                        }
                        try {
                            doc.addImage(emojiData, 'PNG', currentX, currentY - emojiSize * 0.8, emojiSize, emojiSize);
                            currentX += emojiSize + 0.5;
                        } catch (e) {
                            // If emoji fails, show placeholder
                            doc.text('?', currentX, currentY);
                            currentX += charWidth;
                        }
                    } else {
                        // Fallback to ? if emoji not in cache
                        doc.text('?', currentX, currentY);
                        currentX += charWidth;
                    }
                }
            }

            return currentY; // Return final Y position
        };

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 76, 230);
        doc.text('WhatsApp Chat Export', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 7;

        // Subtitle with emoji count
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const emojiCountText = hasEmojis ? ` | ${Object.keys(emojiCache).length} emojis` : '';
        doc.text(`${this.messages.length} messages${emojiCountText} | Exported ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 6;

        // Line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;

        let currentDate = null;

        for (const message of this.messages) {
            // Estimate bubble height (add extra for potential emoji lines)
            const textForEstimate = message.text.replace(/[^\x00-\x7F]/g, '?');
            const textLines = doc.splitTextToSize(textForEstimate, bubbleWidth - bubblePadding * 2);
            const bubbleHeight = textLines.length * lineHeight + bubblePadding * 2 + 8;

            // Check page overflow
            if (yPosition + bubbleHeight > pageHeight - 20) {
                doc.addPage();
                yPosition = margin;
            }

            // Date separator
            if (message.date !== currentDate) {
                currentDate = message.date;
                yPosition += 3;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(139, 92, 246);
                const formattedDate = this.formatDateForSeparator(message.fullDateTime);
                doc.text(formattedDate, pageWidth / 2, yPosition, { align: 'center' });
                yPosition += 5;
            }

            // System messages
            if (message.isSystem) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150, 150, 150);
                const sysText = message.text.replace(/[^\x00-\x7F]/g, '?');
                const sysLines = doc.splitTextToSize(sysText, pageWidth - margin * 4);
                doc.text(sysLines, pageWidth / 2, yPosition, { align: 'center' });
                yPosition += sysLines.length * 3 + 3;
                continue;
            }

            // Determine if this is "self" or "other"
            const isSelf = message.sender === selfUser;
            const bubbleX = isSelf ? pageWidth - margin - bubbleWidth : margin;

            // Draw bubble background
            if (isSelf) {
                doc.setFillColor(138, 92, 246);
            } else {
                doc.setFillColor(55, 55, 70);
            }

            doc.roundedRect(bubbleX, yPosition, bubbleWidth, bubbleHeight, 3, 3, 'F');

            // Sender name
            const textX = bubbleX + bubblePadding;
            let textY = yPosition + bubblePadding + 3;

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            if (isSelf) {
                doc.setTextColor(220, 200, 255);
            } else {
                doc.setTextColor(150, 220, 180);
            }
            const senderText = message.sender.replace(/[^\x00-\x7F]/g, '');
            doc.text(senderText, textX, textY);

            // Time
            doc.setFontSize(6);
            doc.setTextColor(200, 200, 200);
            doc.text(message.time, bubbleX + bubbleWidth - bubblePadding, textY, { align: 'right' });

            textY += 4;

            // Message text with emojis
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(255, 255, 255);
            renderTextWithEmoji(message.text, textX, textY, bubbleWidth - bubblePadding * 2, 9);

            yPosition += bubbleHeight + bubbleMargin;
        }

        // Checksum
        if (this.fileChecksum) {
            if (yPosition > pageHeight - 25) {
                doc.addPage();
                yPosition = margin;
            }
            yPosition += 6;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 5;
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text('SHA-256: ' + this.fileChecksum, margin, yPosition);
        }

        // Save
        const chatName = this.chatName.textContent || 'WhatsApp_Chat';
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${chatName.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.pdf`;
        doc.save(filename);
    }

    // ========================================
    // AI Chat Methods
    // ========================================

    openAiChat() {
        this.aiChatModal.classList.remove('hidden');

        // Check if API key exists
        if (this.geminiApiKey) {
            this.aiSetup.classList.add('hidden');
            this.aiChatInterface.classList.remove('hidden');
            // Update partner name
            const otherParticipant = this.participants.find(p => p !== this.participants[this.currentViewIndex]) || 'this person';
            this.aiChatPartner.textContent = otherParticipant;
        } else {
            this.aiSetup.classList.remove('hidden');
            this.aiChatInterface.classList.add('hidden');
        }
    }

    closeAiChat() {
        this.aiChatModal.classList.add('hidden');
    }

    saveApiKey() {
        const key = this.geminiApiKeyInput.value.trim();
        if (key && key.startsWith('AIza')) {
            this.geminiApiKey = key;
            localStorage.setItem('gemini_api_key', key);
            this.aiSetup.classList.add('hidden');
            this.aiChatInterface.classList.remove('hidden');
            // Update partner name
            const otherParticipant = this.participants.find(p => p !== this.participants[this.currentViewIndex]) || 'this person';
            this.aiChatPartner.textContent = otherParticipant;
        } else {
            alert('Please enter a valid Gemini API key (starts with AIza...)');
        }
    }

    resetApiKey() {
        // Clear stored key
        localStorage.removeItem('gemini_api_key');
        this.geminiApiKey = '';
        this.geminiApiKeyInput.value = '';

        // Show setup screen
        this.aiSetup.classList.remove('hidden');
        this.aiChatInterface.classList.add('hidden');

        // Clear chat history
        this.aiMessages.innerHTML = `
            <div class="ai-message ai-response">
                <strong>AI:</strong> I've analyzed your conversation with <span id="ai-chat-partner">this person</span>. 
                Ask me anything about your chat - relationship dynamics, communication patterns, or summaries!
            </div>
        `;
        this.aiChatPartner = document.getElementById('ai-chat-partner');
    }

    async sendAiMessage() {
        const userMessage = this.aiUserInput.value.trim();
        if (!userMessage) return;

        // Add user message to chat
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'ai-message user-message';
        userMsgDiv.textContent = userMessage;
        this.aiMessages.appendChild(userMsgDiv);

        // Clear input
        this.aiUserInput.value = '';

        // Add loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-message ai-response loading';
        loadingDiv.innerHTML = '<strong>AI:</strong> <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
        this.aiMessages.appendChild(loadingDiv);

        // Scroll to bottom
        this.aiMessages.scrollTop = this.aiMessages.scrollHeight;

        try {
            const response = await this.callGeminiAPI(userMessage);

            // Remove loading indicator
            loadingDiv.remove();

            // Add AI response with formatted markdown
            const aiMsgDiv = document.createElement('div');
            aiMsgDiv.className = 'ai-message ai-response';
            aiMsgDiv.innerHTML = `<strong>AI:</strong> ${this.formatAiResponse(response)}`;
            this.aiMessages.appendChild(aiMsgDiv);

        } catch (error) {
            loadingDiv.remove();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'ai-message ai-response';
            errorDiv.innerHTML = `<strong>AI:</strong> Sorry, there was an error: ${error.message}`;
            this.aiMessages.appendChild(errorDiv);
        }

        // Scroll to bottom
        this.aiMessages.scrollTop = this.aiMessages.scrollHeight;
    }

    // Convert markdown to HTML for AI responses (with XSS protection)
    formatAiResponse(text) {
        // First sanitize the raw text to prevent XSS
        let sanitized = this.sanitizeHTML(text);

        return sanitized
            // Convert **bold** to <strong>
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Convert *italic* to <em>
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Convert newlines to <br>
            .replace(/\n/g, '<br>')
            // Convert bullet points
            .replace(/•/g, '<br>• ')
            .replace(/- /g, '<br>• ')
            // Add spacing after colons in headers
            .replace(/:\s*<br>/g, ':<br><br>');
    }

    buildChatContext() {
        // Strict sampling to save tokens
        const totalMessages = this.messages.length;
        let contextMessages = [];

        if (totalMessages <= 50) {
            // Very small chat - use all
            contextMessages = this.messages;
        } else {
            // Larger chat - limit to 50 messages total
            // First 10 messages (for context of how it started)
            const startMessages = this.messages.slice(0, 10);

            // Last 40 messages (for recent context)
            const endMessages = this.messages.slice(-40);

            contextMessages = [...startMessages, ...endMessages];
        }

        // Format messages for context
        let context = `This is a WhatsApp conversation between ${this.participants.join(' and ')}.\n`;
        context += `Total messages: ${totalMessages}\n`;
        context += `Showing: 10 earliest + 40 most recent messages\n`;
        context += `Date range: ${this.messages[0]?.date || 'Unknown'} to ${this.messages[totalMessages - 1]?.date || 'Unknown'}\n\n`;
        context += `Sample of messages:\n\n`;

        for (const msg of contextMessages) {
            if (!msg.isSystem) {
                context += `[${msg.date} ${msg.time}] ${msg.sender}: ${msg.text}\n`;
            }
        }

        return context.substring(0, 30000); // reduced char limit
    }

    async callGeminiAPI(userMessage) {
        const chatContext = this.buildChatContext();

        const systemPrompt = `You are an AI assistant analyzing a WhatsApp conversation. 
You have access to the chat history and can provide insights about:
- Relationship dynamics between the participants
- Communication patterns and styles
- Key moments or themes in the conversation
- Personality observations
- Summaries of the conversation

Be helpful, insightful, and respectful. Don't make harsh judgments.
Keep responses concise but informative.`;

        const prompt = `${systemPrompt}\n\nCHAT CONTEXT:\n${chatContext}\n\nUSER QUESTION: ${userMessage}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    }

    // ========================================
    // External Link Security Methods
    // ========================================

    // Detect URLs in message text and wrap them with clickable links
    detectAndWrapLinks(text) {
        // First, escape HTML to prevent XSS
        const escapedText = this.sanitizeHTML(text);

        // URL detection regex
        const urlPattern = /(https?:\/\/[^\s<>]+|www\.[^\s<>]+)/gi;

        return escapedText.replace(urlPattern, (match) => {
            // Ensure URL has protocol
            let url = match;
            if (match.startsWith('www.')) {
                url = 'https://' + match;
            }

            // Create a safe link with external warning handler
            return `<a href="#" class="message-link" data-external-url="${this.sanitizeHTML(url)}" onclick="event.preventDefault(); window.chatViewer.handleExternalLink('${this.sanitizeHTML(url)}')">${match}</a>`;
        });
    }

    // Handle click on external link
    handleExternalLink(url) {
        // If user has opted to skip warnings this session, proceed directly
        if (this.skipExternalLinkWarning) {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        // Store pending URL and show modal
        this.pendingExternalUrl = url;
        this.externalLinkUrl.textContent = url;
        this.dontWarnAgainCheckbox.checked = false;
        this.externalLinkModal.classList.remove('hidden');
    }

    // Close external link modal without navigating
    closeExternalLinkModal() {
        this.externalLinkModal.classList.add('hidden');
        this.pendingExternalUrl = null;
    }

    // Proceed to external link after user confirmation
    proceedToExternalLink() {
        if (this.pendingExternalUrl) {
            // Check if user wants to skip future warnings
            if (this.dontWarnAgainCheckbox.checked) {
                this.skipExternalLinkWarning = true;
            }

            // Open link in new tab with security attributes
            window.open(this.pendingExternalUrl, '_blank', 'noopener,noreferrer');
        }

        this.closeExternalLinkModal();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Expose to window for external link handling
    window.chatViewer = new WhatsAppChatViewer();
});
