import React, { useEffect, useRef } from 'react';

interface FileViewerProps {
  file: File;
  onClose?: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({ file, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // הוספת הסטיילים
    const styles = `
      .file-viewer-container {
        width: 100%;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        margin: 20px 0;
      }

      .file-viewer-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .file-viewer-content {
        min-height: 400px;
        position: relative;
        background: #f9f9f9;
      }

      .file-viewer-image {
        text-align: center;
        padding: 20px;
        background: white;
      }

      .file-viewer-image img {
        max-width: 100%;
        max-height: 70vh;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      .file-viewer-pdf {
        background: white;
      }

      .file-viewer-pdf-controls {
        background: #f8f9fa;
        padding: 15px;
        text-align: center;
        border-bottom: 1px solid #eee;
      }

      .file-viewer-pdf-controls button {
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 16px;
        margin: 0 5px;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.3s;
      }

      .file-viewer-pdf-controls button:hover:not(:disabled) {
        background: #5a6fd8;
      }

      .file-viewer-pdf-controls button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .file-viewer-pdf canvas {
        width: 100%;
        height: auto;
        display: block;
      }

      .file-viewer-document {
        padding: 30px;
        line-height: 1.6;
        background: white;
        color: #333;
      }

      .file-viewer-loading {
        text-align: center;
        padding: 50px;
        color: #666;
        font-size: 16px;
      }

      .file-viewer-error {
        background: #f8d7da;
        color: #721c24;
        padding: 20px;
        text-align: center;
        border: 1px solid #f1b0b7;
        margin: 20px;
        border-radius: 5px;
      }

      @media (max-width: 768px) {
        .file-viewer-container {
          margin: 10px 0;
        }
        
        .file-viewer-header {
          padding: 10px 15px;
          font-size: 14px;
        }
        
        .file-viewer-document {
          padding: 20px 15px;
        }
      }
    `;

    if (!document.querySelector('#file-viewer-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'file-viewer-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    initializeFileViewer();
  }, [file]);

  const initializeFileViewer = () => {
    if (!containerRef.current) return;

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const fileSize = (file.size / 1024 / 1024).toFixed(2);

    containerRef.current.innerHTML = `
      <div class="file-viewer-container">
        <div class="file-viewer-header">
          <span>📄 ${file.name}</span>
          <span>${fileSize} MB</span>
        </div>
        <div class="file-viewer-content" id="viewer-content">
          <div class="file-viewer-loading">טוען קובץ...</div>
        </div>
      </div>
    `;

    const viewerContent = containerRef.current.querySelector('#viewer-content');
    if (!viewerContent) return;

    if (isImage(fileType, fileName)) {
      displayImage(file, viewerContent);
    } else if (isPDF(fileType, fileName)) {
      displayPDF(file, viewerContent);
    } else if (isDocument(fileType, fileName)) {
      displayDocument(file, viewerContent);
    } else {
      viewerContent.innerHTML = '<div class="file-viewer-error">פורמט קובץ לא נתמך</div>';
    }
  };

  const isImage = (fileType: string, fileName: string) => {
    return fileType.includes('image/') || 
           fileName.endsWith('.jpg') || 
           fileName.endsWith('.jpeg') || 
           fileName.endsWith('.png');
  };

  const isPDF = (fileType: string, fileName: string) => {
    return fileType.includes('pdf') || fileName.endsWith('.pdf');
  };

  const isDocument = (fileType: string, fileName: string) => {
    return fileType.includes('document') || 
           fileName.endsWith('.doc') || 
           fileName.endsWith('.docx');
  };

  const displayImage = (file: File, container: Element) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      container.innerHTML = `
        <div class="file-viewer-image">
          <img src="${e.target?.result}" alt="${file.name}" />
        </div>
      `;
    };
    reader.readAsDataURL(file);
  };

  const displayPDF = (file: File, container: Element) => {
    // פתרון פשוט - הצגה באמצעות object או iframe
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      container.innerHTML = `
        <div class="file-viewer-pdf">
          <object 
            data="${result}" 
            type="application/pdf" 
            width="100%" 
            height="600px"
            style="min-height: 500px;"
          >
            <iframe 
              src="${result}" 
              width="100%" 
              height="600px" 
              style="border: none;"
            >
              <div class="file-viewer-error">לא ניתן להציג את קובץ ה-PDF</div>
            </iframe>
          </object>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  };

  const displayDocument = (file: File, container: Element) => {
    if (file.name.toLowerCase().endsWith('.docx')) {
      container.innerHTML = `
        <div class="file-viewer-document">
          <div style="text-align: center; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
            <h3>${file.name}</h3>
            <p>קובץ Word - לא ניתן להציג בדפדפן</p>
            <p>הנתונים חולצו אוטומטית לטופס</p>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="file-viewer-error">
          קבצי DOC (פורמט ישן) אינם נתמכים.<br>
          אנא המר ל-DOCX או שמור מחדש בפורמט חדש.
        </div>
      `;
    }
  };

  return (
    <div ref={containerRef} data-testid="file-viewer-container">
      {/* הקומפוננטה תיטען כאן באמצעות JavaScript */}
    </div>
  );
};