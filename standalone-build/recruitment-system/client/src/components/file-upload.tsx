import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, File, X } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
}

export default function FileUpload({ 
  onFileSelect, 
  accept = ".pdf,.doc,.docx", 
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false 
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>("");

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      setError(`הקובץ גדול מדי. מקסימום ${Math.round(maxSize / 1024 / 1024)}MB`);
      return false;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      setError(`סוג קובץ לא נתמך. קבצים מורשים: ${accept}`);
      return false;
    }

    setError("");
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect, maxSize, accept]);

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const clearFile = () => {
    setSelectedFile(null);
    onFileSelect(null);
    setError("");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full" data-testid="file-upload-container">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-primary'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3 space-x-reverse">
              <File className="h-8 w-8 text-green-600" />
              <div className="text-right">
                <p className="font-medium text-gray-900 dark:text-white" data-testid="text-selected-file">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="text-red-600 hover:text-red-700"
                data-testid="button-clear-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                גרור וזרוק קבצים כאן או
              </p>
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('file-input')?.click()}
                data-testid="button-select-file"
              >
                בחר קבצים
              </Button>
              <input
                id="file-input"
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileInput}
                className="hidden"
                data-testid="input-file"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {accept.replace(/\./g, '').toUpperCase()} עד {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" data-testid="text-file-error">
          {error}
        </p>
      )}
    </div>
  );
}
