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
        if (!file.name.endsWith('.txt')) {
            alert('Please upload a .txt file');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;

            // Calculate Checksum for Data Integrity
            try {
                this.fileChecksum = await this.calculateChecksum(content);
            } catch (err) {
                console.error("Checksum failed", err);
                this.fileChecksum = "Error calculating checksum";
            }

            this.parseChat(content);
            this.showChatScreen();
        };
        reader.readAsText(file);
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

                    currentMessage = {
                        id: `msg_${this.messages.length}_${Date.now()}`,
                        date: date,
                        time: this.formatTime(time),
                        sender: cleanSender,
                        text: text,
                        isSystem: isSystemMessage,
                        fullDateTime: this.parseDateTime(date, time, dateFormat)
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

        // Add a small animation feedback
        this.switchViewBtn.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            this.switchViewBtn.style.transform = 'rotate(0deg)';
        }, 300);
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

        // Message text
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = message.text;
        div.appendChild(textDiv);

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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="11" viewBox="0 0 16 11">
                    <path fill="currentColor" d="M11.071 0L5.714 5.357 3.071 2.714 0 5.786l5.714 5.714L14.143 3.071z"/>
                    <path fill="currentColor" d="M15.071 3.071L12 0 6.714 5.286l3.072 3.071z"/>
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
            this.renderMessages();
        }

        // Find the message element
        setTimeout(() => {
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
        }, 100);
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

        // Create a container for the PDF content
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: 210mm;
            padding: 15mm;
            background: white;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
        `;

        // Build HTML content
        let html = `
            <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #8b5cf6;">
                <h1 style="color: #6b4ce6; font-size: 20px; margin: 0 0 5px 0;">WhatsApp Chat Export</h1>
                <div style="color: #666; font-size: 11px;">${this.messages.length} messages | Exported on ${new Date().toLocaleDateString()}</div>
            </div>
        `;

        let currentDate = null;

        for (const message of this.messages) {
            // Date separator
            if (message.date !== currentDate) {
                currentDate = message.date;
                const formattedDate = this.formatDateForSeparator(message.fullDateTime);
                html += `<div style="text-align: center; margin: 15px 0 10px; color: #8b5cf6; font-weight: 600; font-size: 11px;">--- ${formattedDate} ---</div>`;
            }

            if (message.isSystem) {
                html += `<div style="text-align: center; color: #999; font-style: italic; font-size: 10px; margin: 8px 0;">${this.escapeHtml(message.text)}</div>`;
            } else {
                html += `
                    <div style="margin-bottom: 10px; page-break-inside: avoid;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <span style="color: #6b4ce6; font-weight: 600; font-size: 11px;">${this.escapeHtml(message.sender)}</span>
                            <span style="color: #999; font-size: 10px;">${message.time}</span>
                        </div>
                        <div style="color: #333; font-size: 12px;">${this.escapeHtml(message.text)}</div>
                    </div>
                `;
            }
        }

        // Add checksum
        if (this.fileChecksum) {
            html += `
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 9px; color: #666;">
                    <div>Data Integrity Checksum (SHA-256):</div>
                    <div style="font-family: monospace; font-size: 8px; word-break: break-all; color: #888;">${this.fileChecksum}</div>
                </div>
            `;
        }

        container.innerHTML = html;
        document.body.appendChild(container);

        // Generate filename
        const chatName = this.chatName.textContent || 'WhatsApp_Chat';
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${chatName.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.pdf`;

        // PDF options
        const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: { mode: 'avoid-all' }
        };

        // Generate and download PDF
        html2pdf().set(opt).from(container).save().then(() => {
            // Cleanup
            document.body.removeChild(container);
            this.downloadPdfBtn.innerHTML = originalBtnContent;
            this.downloadPdfBtn.disabled = false;
        }).catch(err => {
            console.error('PDF generation failed:', err);
            document.body.removeChild(container);
            this.downloadPdfBtn.innerHTML = originalBtnContent;
            this.downloadPdfBtn.disabled = false;
            alert('PDF generation failed. Please try again.');
        });
    }

    // Helper to escape HTML special characters
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppChatViewer();
});
