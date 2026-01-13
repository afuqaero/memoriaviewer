# MemoriaViewer 📱✨

**MemoriaViewer** (WhatsApp Chat Viewer) is a modern, privacy-focused, and high-performance web tool designed to bring your exported WhatsApp chat logs to life. Transform dull `.txt` files into a beautiful, interactive, and searchable chat interface right in your browser.

> **Note:** All processing happens **locally** on your device. Your chat data is never uploaded to any server.

## ✨ Features

- **🎨 Modern Aesthetic**: A sleek dark-mode interface with a deep purple/navy theme, glassmorphism effects, and unqiue message bubbles.
- **⚡ High Performance**: Built with **virtual scrolling** and chunked rendering to handle massive chat logs (hundreds of thousands of messages) without lag.
- **📅 Smart Navigation**: 
  - **Date Picker**: Instantly jump to specific dates.
  - **Floating Date Bubble**: See exactly when messages were sent as you scroll.
  - **Bidirectional Loading**: Seamlessly load older or newer messages on demand.
- **⭐ Starred Messages**: Star important messages to save them for later. Your starred messages are persisted locally.
- **🔍 Message Filtering**: Quickly toggle to view only your starred moments.
- **🔒 Privacy First**: Zero server-side code. It uses the generic HTML5 `FileReader` API to parse text files directly in your browser.

## 🚀 Getting Started

### Prerequisites
You just need a modern web browser (Chrome, Edge, Firefox, Safari).

### Usage

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/afuqaero/memoriaviewer.git
    ```
2.  **Open the viewer:**
    Simply double-click `index.html` to open it in your browser.
3.  **Export a WhatsApp Chat:**
    - Open WhatsApp on your phone.
    - Go to the chat you want to export.
    - Tap on the contact name/group info -> **Export Chat**.
    - Select **"Without Media"** (currently supports text only).
    - Save the `.txt` file to your computer.
4.  **Upload & Enjoy:**
    Drag and drop your `.txt` file into MemoriaViewer or click to select content.

## 🛠️ Built With

- **HTML5** - Semantics and structure.
- **CSS3** - Custom variables, Flexbox, Grid, and animations (No frameworks).
- **Vanilla JavaScript** - Logic, parsing, and virtual DOM management.

## 📸 Screenshots

<img width="715" height="922" alt="image" src="https://github.com/user-attachments/assets/2f15e7b0-7f0a-437f-98cf-3d194796a725" />


## 🤝 Contributing

Contributions are welcome! If you have suggestions for how to improve the viewer, please open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 👤 Author

**feeqazmir**

---
*Created with ❤️ for preserving memories.*
