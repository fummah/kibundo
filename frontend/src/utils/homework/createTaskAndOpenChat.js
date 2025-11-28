// src/utils/homework/createTaskAndOpenChat.js
import api from "@/api/axios";
import { makeId, fmt, trySaveJson } from "./homeworkHelpers";

/**
 * Creates a task, uploads file if provided, analyzes it, and opens the chat
 * @param {Object} params
 * @param {File|null} params.file - File to upload (image or document)
 * @param {Object} params.meta - Metadata for the task (subject, what, description, source, taskId)
 * @param {Function} params.compressImage - Function to compress images
 * @param {Function} params.uploadWithApi - Function to upload file via API
 * @param {Function} params.setUploading - Function to set uploading state
 * @param {Function} params.openAndFocusChat - Function to open and focus chat
 * @param {Function} params.appendToChat - Function to append messages to chat
 * @param {Function} params.replaceMessageInChat - Function to replace messages in chat
 * @param {Function} params.loadTasks - Function to load tasks from storage
 * @param {Function} params.readProgressForUser - Function to read progress from storage
 * @param {string} params.storageKey - Storage key for scoping
 * @param {string} params.TASKS_KEY_USER - Tasks storage key
 * @param {string} params.PROGRESS_KEY_USER - Progress storage key
 * @param {string|null} params.studentId - Student ID
 * @param {string} params.selectedAgent - Selected agent name
 * @param {Function} params.antdMessage - Ant Design message function
 */
export async function createTaskAndOpenChat({
  file = null,
  meta = {},
  compressImage,
  uploadWithApi,
  setUploading,
  openAndFocusChat,
  appendToChat,
  replaceMessageInChat,
  getChatMessages,
  setChatMessages,
  loadTasks,
  readProgressForUser,
  storageKey,
  TASKS_KEY_USER,
  PROGRESS_KEY_USER,
  studentId,
  selectedAgent,
  antdMessage,
}) {
  const id = meta.taskId || makeId();
  const mode = "homework";
  // Note: appendToChat expects (mode, taskId), not the full scopedKey
  // ChatDockContext will construct the key internally as: kibundo.chat.v1:${mode}:${taskId}

  setUploading(true);

  try {
    // Load existing tasks
    const tasks = loadTasks();
    const existingTask = tasks.find((t) => t.id === id);

    // Create or update task object
    const taskData = {
      id,
      createdAt: existingTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subject: meta.subject || "Sonstiges",
      what: meta.what || (file ? (file.type?.startsWith("image/") ? "Bild" : "Datei") : "Audio-Aufgabe"),
      description: meta.description || "",
      source: meta.source || (file ? (file.type?.startsWith("image/") ? "image" : "file") : "audio"),
      userId: studentId,
      done: false,
      ...(existingTask || {}),
      ...meta,
    };

    // Update tasks in storage
    const updatedTasks = existingTask
      ? tasks.map((t) => (t.id === id ? taskData : t))
      : [...tasks, taskData];
    trySaveJson(TASKS_KEY_USER, updatedTasks);

    // Update progress
    const currentProgress = readProgressForUser();
    trySaveJson(PROGRESS_KEY_USER, {
      step: 1,
      taskId: id,
      task: taskData,
    });

    // Open chat immediately with task
    openAndFocusChat(id, taskData);

    // Add initial message to chat (pass taskId, not scopedKey)
    const initialMessage = file
      ? fmt("Datei wird hochgeladen und analysiert…", "agent", "status", {
          transient: true,
          agentName: selectedAgent || "Kibundo",
        })
      : fmt("Ich höre zu. Erzähle mir, was du zu tun hast.", "agent", "text", {
          agentName: selectedAgent || "Kibundo",
        });

    appendToChat(mode, id, [initialMessage]);

    // If no file, just open chat for audio input
    if (!file) {
      setUploading(false);
      return;
    }

    // Compress image if needed
    let fileToUpload = file;
    if (file.type?.startsWith("image/")) {
      fileToUpload = await compressImage(file);
    }

    // Upload file
    const uploadResult = await uploadWithApi(fileToUpload);

    if (!uploadResult?.scanId && !uploadResult?.scan?.id) {
      throw new Error("Upload succeeded but no scan ID returned");
    }

    const scanId = uploadResult.scanId || uploadResult.scan?.id;

    // Update task with scan ID
    const taskWithScan = {
      ...taskData,
      scanId,
      updatedAt: new Date().toISOString(),
    };
    const finalTasks = updatedTasks.map((t) => (t.id === id ? taskWithScan : t));
    trySaveJson(TASKS_KEY_USER, finalTasks);

    // Update progress to step 1 (scan completed)
    trySaveJson(PROGRESS_KEY_USER, {
      step: 1,
      taskId: id,
      task: taskWithScan,
    });

    // 🔥 Update task in dockState with scanId (so it's immediately available)
    // This ensures the task in the opened chat has the scanId
    openAndFocusChat(id, taskWithScan);

    // The upload endpoint already returns all analysis data - no separate analyze call needed
    // Use the uploadResult directly as scanData
    const scanData = uploadResult;

    // Replace loading message with result (only if we have scan data)
    const loadingMsg = initialMessage;
    if (loadingMsg && scanData) {
      replaceMessageInChat(mode, id, loadingMsg.id, () =>
        fmt("Analyse abgeschlossen.", "agent", "status", {
          transient: true,
          agentName: selectedAgent || "Kibundo",
        })
      );
    }

    // Add scan results to chat (upload already includes all analysis data)
    if (scanData && scanData.success) {
      // If this is an existing task with an old scan, clear old scan-related messages
      if (existingTask?.scanId && existingTask.scanId !== scanId && getChatMessages && setChatMessages) {
        // Clearing old scan messages for new scan
        
        // Get existing messages and filter out scan-related ones
        const existingMessages = getChatMessages(mode, id) || [];
        const filteredMessages = existingMessages.filter(msg => {
          // Keep student messages
          if (msg.from === "student") return true;
          
          // Remove scan-related messages
          const contentStr = typeof msg?.content === "string" ? msg.content : JSON.stringify(msg?.content || "");
          const isScanRelated = 
            msg.type === "table" || // Scan result tables
            msg.type === "tip" || // Tip messages
            contentStr.includes("I've read your homework") ||
            contentStr.includes("Subject:") ||
            contentStr.includes("Fach erkannt:") ||
            contentStr.includes("What I saw in your picture") ||
            (msg.type === "status" && contentStr.includes("analysiert"));
          
          return !isScanRelated;
        });
        
        // Update messages to remove old scan-related content
        if (filteredMessages.length !== existingMessages.length) {
          setChatMessages(mode, id, filteredMessages);
        }
      }
      // Adding scan results to chat
      const extracted = scanData?.scan?.raw_text ?? scanData?.extractedText ?? "";
      const rawQa = Array.isArray(scanData?.parsed?.questions)
        ? scanData.parsed.questions
        : Array.isArray(scanData?.qa)
        ? scanData.qa
        : [];

      // Filter out answers - only keep questions
      const qa = rawQa.map((item) => {
        const sanitized = {};
        if (item.text) sanitized.text = item.text;
        if (item.question) sanitized.question = item.question;
        if (item.id) sanitized.id = item.id;
        if (item.type) sanitized.type = item.type;
        return sanitized;
      });

      const messagesToAppend = [];

      // Add subject notification if detected
      const aiDetectedSubject = scanData?.parsed?.subject || scanData?.scan?.detected_subject;
      if (aiDetectedSubject) {
        const subjectEmoji = {
          Mathe: "🔢",
          Deutsch: "📗",
          Englisch: "🇬🇧",
          Sachkunde: "🔬",
          Erdkunde: "🌍",
          Kunst: "🎨",
          Musik: "🎵",
          Sport: "⚽",
        }[aiDetectedSubject] || "📚";

        messagesToAppend.push(
          fmt(`${subjectEmoji} Subject: ${aiDetectedSubject}`, "agent", "text", {
            agentName: selectedAgent || "Kibundo",
          })
        );
      }

      // Add extraction result
      const resultMsg =
        extracted || qa.length
          ? fmt({ extractedText: extracted, qa }, "agent", "table", {
              agentName: selectedAgent || "Kibundo",
            })
          : fmt(
              "Ich habe das Dokument erhalten, konnte aber nichts Brauchbares extrahieren.",
              "agent",
              "text",
              { agentName: selectedAgent || "Kibundo" }
            );

      messagesToAppend.push(resultMsg);
      
      // Add tip message
      const tipMsg = fmt(
        "💡 Tipp: Versuche zuerst selbst, die Fragen zu beantworten. Wenn du Hilfe brauchst oder nicht weiterkommst, frage mich einfach!",
        "agent",
        "tip",
        { agentName: selectedAgent || "Kibundo" }
      );
      messagesToAppend.push(tipMsg);
      
      // Appending messages to chat
      appendToChat(mode, id, messagesToAppend);

      // Update task with conversation ID if available
      if (scanData.conversationId) {
        const taskWithConvId = {
          ...taskWithScan,
          conversationId: scanData.conversationId,
        };
        const tasksWithConv = finalTasks.map((t) => (t.id === id ? taskWithConvId : t));
        trySaveJson(TASKS_KEY_USER, tasksWithConv);

        // 🔥 Update task in dockState with conversationId
        openAndFocusChat(id, taskWithConvId);

        // Store conversation ID in localStorage
        try {
          const convKey = `kibundo.convId.${id}`;
          localStorage.setItem(convKey, String(scanData.conversationId));
        } catch (e) {
          // Ignore quota errors
        }
      }
    }

    setUploading(false);
    antdMessage.success("Aufgabe erstellt – der Chat zeigt jetzt die Analyse.");
  } catch (error) {
    console.error("Error in createTaskAndOpenChat:", error);
    setUploading(false);

    // Add error message to chat
    const errorMsg = fmt(
      error.message || "Ein Fehler ist aufgetreten. Bitte versuche es erneut.",
      "agent",
      "text",
      { agentName: selectedAgent || "Kibundo" }
    );
    appendToChat(mode, id, [errorMsg]);

    antdMessage.error(error.message || "Fehler beim Erstellen der Aufgabe");
  }
}

