// Speaking Chunk — Content Script
// Lắng nghe bôi đen từ/cụm từ, trích xuất câu ngữ cảnh, hiển thị AI Tooltip với Shadow DOM

(function () {
  let shadowHost = null;
  let shadowRoot = null;
  let currentSelectionData = null;

  // ─── Tạo Shadow DOM Host (chống xung đột CSS trang web) ───────
  function initShadowHost() {
    if (shadowHost) return;
    shadowHost = document.createElement('div');
    shadowHost.id = 'speaking-chunk-extension-root';
    shadowHost.style.position = 'absolute';
    shadowHost.style.top = '0';
    shadowHost.style.left = '0';
    shadowHost.style.zIndex = '2147483647';
    shadowHost.style.pointerEvents = 'none';
    document.body.appendChild(shadowHost);
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  }

  // ─── Trích xuất câu hoàn chỉnh chứa từ được chọn ────────────
  function extractContextSentence(selection) {
    if (!selection.rangeCount) return '';
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;

    // Tìm thẻ block cha (p, li, div, h1-h6, blockquote, v.v.)
    while (container && container.nodeType !== Node.ELEMENT_NODE) {
      container = container.parentNode;
    }

    if (!container) return selection.toString();

    // Lấy toàn bộ text của block
    const fullText = container.innerText || container.textContent || '';
    const selectedText = selection.toString().trim();

    // Tách câu theo dấu chấm, chấm hỏi, chấm than hoặc xuống dòng
    const sentences = fullText.split(/(?<=[.!?\n])\s+/);
    for (const s of sentences) {
      if (s.includes(selectedText)) {
        return s.trim();
      }
    }

    return selectedText;
  }

  // ─── Đóng Tooltip ──────────────────────────────────────────
  function closeTooltip() {
    if (shadowRoot) {
      shadowRoot.innerHTML = '';
      if (shadowHost) shadowHost.style.pointerEvents = 'none';
    }
    currentSelectionData = null;
  }

  // ─── Render Tooltip UI ──────────────────────────────────────
  function renderTooltip(coords, initialLoading = true, data = null, error = null, needAuth = false) {
    initShadowHost();
    shadowHost.style.pointerEvents = 'auto';

    // Đảm bảo tọa độ nằm trong màn hình
    const tooltipWidth = 320;
    const padding = 16;
    let left = coords.left;
    let top = coords.bottom + 8;

    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (left < padding) left = padding;

    // Nếu tooltip bị che phía dưới, đẩy lên trên vùng bôi đen
    if (top + 220 > window.innerHeight) {
      top = Math.max(padding, coords.top - 210);
    }

    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    const styles = `
      <style>
        .sc-card {
          position: absolute;
          left: ${left + scrollX}px;
          top: ${top + scrollY}px;
          width: 320px;
          background: #111827;
          color: #f9fafb;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          line-height: 1.5;
          z-index: 2147483647;
          pointer-events: auto;
          animation: scFadeIn 0.18s ease-out;
          box-sizing: border-box;
        }

        @keyframes scFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .sc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1f2937;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }

        .sc-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sc-badge-logo {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sc-btn-close {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 16px;
          padding: 2px 4px;
          line-height: 1;
          border-radius: 4px;
        }
        .sc-btn-close:hover {
          color: #f3f4f6;
          background: #374151;
        }

        .sc-word-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 4px;
        }

        .sc-word {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
        }

        .sc-ipa {
          font-size: 12px;
          color: #9ca3af;
          font-family: monospace;
        }

        .sc-pos {
          font-size: 11px;
          padding: 1px 6px;
          background: rgba(99, 102, 241, 0.18);
          color: #818cf8;
          border-radius: 4px;
          font-weight: 600;
          display: inline-block;
          margin-bottom: 8px;
        }

        .sc-meaning {
          font-size: 14px;
          font-weight: 600;
          color: #34d399;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .sc-note {
          font-size: 11.5px;
          color: #9ca3af;
          font-style: italic;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .sc-context-box {
          background: #1f2937;
          border-left: 3px solid #6366f1;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 11.5px;
          color: #d1d5db;
          margin-bottom: 12px;
          max-height: 60px;
          overflow-y: auto;
          line-height: 1.4;
        }

        .sc-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .sc-btn-save {
          flex: 1;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #ffffff;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .sc-btn-save:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .sc-btn-save.saved {
          background: #059669;
          color: #ffffff;
          cursor: default;
        }

        /* Skeleton Loading */
        .sc-skeleton {
          animation: scPulse 1.4s ease-in-out infinite;
          background: #374151;
          border-radius: 4px;
        }
        @keyframes scPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }

        .sc-sk-line {
          height: 14px;
          margin-bottom: 8px;
        }

        .sc-error {
          color: #f87171;
          font-size: 12px;
          padding: 8px 0;
        }
      </style>
    `;

    let bodyContent = '';

    if (initialLoading) {
      bodyContent = `
        <div class="sc-word-row">
          <div class="sc-skeleton" style="width: 120px; height: 18px;"></div>
          <div class="sc-skeleton" style="width: 60px; height: 14px;"></div>
        </div>
        <div class="sc-skeleton sc-sk-line" style="width: 80px; margin-bottom: 10px;"></div>
        <div class="sc-skeleton sc-sk-line" style="width: 100%; height: 20px; margin-bottom: 10px;"></div>
        <div class="sc-skeleton sc-sk-line" style="width: 85%;"></div>
      `;
    } else if (error) {
      bodyContent = `
        <div class="sc-error">${error}</div>
        ${needAuth ? `
          <div style="font-size: 11px; color: #9ca3af; margin-top: 6px;">
            Bấm vào biểu tượng extension trên thanh công cụ để đăng nhập.
          </div>
        ` : ''}
      `;
    } else if (data) {
      bodyContent = `
        <div class="sc-word-row">
          <span class="sc-word">${data.word}</span>
          ${data.ipa ? `<span class="sc-ipa">${data.ipa}</span>` : ''}
        </div>
        ${data.partOfSpeech ? `<span class="sc-pos">${data.partOfSpeech}</span>` : ''}
        <div class="sc-meaning">${data.meaningVi}</div>
        ${data.briefNote ? `<div class="sc-note">${data.briefNote}</div>` : ''}
        ${currentSelectionData?.sentence ? `
          <div class="sc-context-box" title="Câu ngữ cảnh thực tế">
            "${currentSelectionData.sentence}"
          </div>
        ` : ''}
        <div class="sc-actions">
          <button id="sc-save-btn" class="sc-btn-save">
            <span>+ Lưu vào Giỏ từ</span>
          </button>
        </div>
      `;
    }

    shadowRoot.innerHTML = `
      ${styles}
      <div class="sc-card">
        <div class="sc-header">
          <div class="sc-title-wrap">
            <span class="sc-badge-logo">AI Dịch ngữ cảnh</span>
          </div>
          <button id="sc-close-btn" class="sc-btn-close" title="Đóng (Esc)">✕</button>
        </div>
        ${bodyContent}
      </div>
    `;

    // Gắn sự kiện nút đóng
    const closeBtn = shadowRoot.getElementById('sc-close-btn');
    if (closeBtn) closeBtn.onclick = closeTooltip;

    // Gắn sự kiện nút Lưu vào giỏ
    const saveBtn = shadowRoot.getElementById('sc-save-btn');
    if (saveBtn && data) {
      saveBtn.onclick = async () => {
        saveBtn.innerText = 'Đang lưu...';
        saveBtn.disabled = true;

        chrome.runtime.sendMessage({
          action: 'SAVE_WORD',
          data: {
            word: data.word,
            meaningVi: data.meaningVi,
            partOfSpeech: data.partOfSpeech || '',
            ipa: data.ipa || '',
            contextSentence: currentSelectionData?.sentence || '',
            sourceUrl: window.location.href,
            sourceTitle: document.title || '',
          },
        }, (res) => {
          if (res?.success) {
            saveBtn.className = 'sc-btn-save saved';
            saveBtn.innerHTML = '✓ Đã lưu vào Giỏ từ!';
          } else {
            saveBtn.disabled = false;
            saveBtn.className = 'sc-btn-save';
            saveBtn.innerHTML = '+ Thử lưu lại';
            alert(res?.error || 'Chưa thể lưu từ. Hãy kiểm tra đăng nhập trên Extension.');
          }
        });
      };
    }
  }

  // ─── Lắng nghe sự kiện bôi đen (Mouseup) ─────────────────────
  document.addEventListener('mouseup', (e) => {
    // Nếu click bên trong Tooltip thì không đóng/xử lý lại
    if (shadowHost && e.composedPath().includes(shadowHost)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      // Kiểm tra độ dài từ/cụm từ (từ 1 đến 8 từ)
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (!text || wordCount < 1 || wordCount > 8) {
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) return;

      const sentence = extractContextSentence(selection);
      currentSelectionData = {
        word: text,
        sentence,
        rect,
      };

      // Render tooltip đang tải
      renderTooltip(rect, true);

      // Gửi sang Background Worker gọi Gemini dịch ngữ cảnh
      chrome.runtime.sendMessage({
        action: 'TRANSLATE_CONTEXT',
        data: {
          word: text,
          sentence,
          pageUrl: window.location.href,
          pageTitle: document.title,
        },
      }, (res) => {
        if (chrome.runtime.lastError) {
          console.warn('Speaking Chunk Extension:', chrome.runtime.lastError.message);
          renderTooltip(rect, false, null, 'Vui lòng nhấn F5 (Tải lại trang) để kết nối tiện ích sau khi vừa cài đặt/cập nhật.');
          return;
        }

        if (res?.success) {
          renderTooltip(rect, false, res.data);
        } else {
          renderTooltip(rect, false, null, res?.error || 'Không thể dịch từ này', res?.needAuth);
        }
      });
    }, 80);
  });

  // Đóng tooltip khi click ra ngoài hoặc bấm ESC
  document.addEventListener('mousedown', (e) => {
    if (shadowHost && !e.composedPath().includes(shadowHost)) {
      closeTooltip();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTooltip();
  });
})();
