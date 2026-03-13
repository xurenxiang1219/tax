'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertTriangle, CheckCircle, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useReimbursementStore } from '@/store/reimbursement-store';
import { checkDuplicate } from '@/lib/detector';

/**
 * 上传文件状态
 */
interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'duplicate-warning';
  error?: string;
  isDuplicate?: boolean;
  duplicateInvoice?: any;
}

/**
 * 发票上传组件属性
 */
interface InvoiceUploaderProps {
  /** 报销事项 ID */
  itemId: string;
}

/**
 * 支持的文件类型
 */
const SUPPORTED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
};

const SUPPORTED_EXTENSIONS = Object.values(SUPPORTED_TYPES).join(',');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 发票上传组件
 * 
 * 支持点击选择文件、拖拽上传、批量上传、显示上传进度和去重警告
 * 验证需求: 2.1, 2.2, 12.1, 12.2, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5, 18.3, 18.4, 18.5, 18.6
 */
export function InvoiceUploader({ itemId }: InvoiceUploaderProps) {
  const currentItem = useReimbursementStore((state) => state.currentItem);
  const addInvoice = useReimbursementStore((state) => state.addInvoice);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 生成唯一文件 ID
   * @returns 随机生成的文件 ID
   */
  const generateFileId = () => Math.random().toString(36).substring(2, 11);

  /**
   * 验证文件格式和大小
   * @param file - 待验证的文件
   * @returns 验证结果
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      return {
        valid: false,
        error: '不支持的文件格式。支持的格式：PDF、JPEG、PNG',
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return {
        valid: false,
        error: `文件大小超过限制。最大允许 10MB，当前文件大小为 ${sizeMB}MB`,
      };
    }

    return { valid: true };
  };

  /**
   * 检查文件是否重复
   * @param file - 待检查的文件
   * @returns 重复检查结果（包含 isDuplicate、matchedInvoice、confidence）
   */
  const checkFileDuplicate = (file: File) => {
    if (!currentItem?.invoices) {
      return { 
        isDuplicate: false, 
        matchedInvoice: undefined, 
        confidence: 0 
      };
    }

    return checkDuplicate(
      file.name,
      file.size,
      currentItem.invoices.map(inv => ({
        id: inv.id,
        fileName: inv.fileName,
        fileSize: inv.fileSize,
        createdAt: inv.createdAt,
      }))
    );
  };

  /**
   * 处理文件选择
   * @param files - 选中的文件列表
   * 
   * 对每个文件进行验证和重复检查，然后添加到上传队列
   */
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploadFiles: UploadFile[] = fileArray.map((file) => {
      const validation = validateFile(file);
      const duplicateCheck = checkFileDuplicate(file);

      // 根据验证结果确定初始状态
      let status: UploadFile['status'] = 'pending';
      if (!validation.valid) {
        status = 'error';
      } else if (duplicateCheck.isDuplicate) {
        status = 'duplicate-warning';
      }

      return {
        id: generateFileId(),
        file,
        progress: 0,
        status,
        error: validation.error,
        isDuplicate: duplicateCheck.isDuplicate,
        duplicateInvoice: duplicateCheck.matchedInvoice,
      };
    });

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  }, [currentItem]);

  /**
   * 更新单个文件的状态
   * @param fileId - 文件 ID
   * @param updates - 状态更新对象
   */
  const updateFileStatus = (fileId: string, updates: Partial<UploadFile>) => {
    setUploadFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, ...updates } : f)
    );
  };

  /**
   * 上传单个文件到服务器
   * @param uploadFile - 待上传的文件对象
   * 
   * 上传流程：
   * 1. 创建 FormData 并添加文件
   * 2. 启动进度模拟（每 200ms 增加 5%，最高到 90%）
   * 3. 发送 POST 请求到 API
   * 4. 处理响应：成功则更新 store，失败则显示错误
   */
  const uploadFile = async (uploadFile: UploadFile) => {
    const formData = new FormData();
    formData.append('files', uploadFile.file);

    try {
      updateFileStatus(uploadFile.id, { status: 'uploading', progress: 0 });

      // 模拟上传进度（实际进度由服务器响应决定）
      const progressInterval = setInterval(() => {
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id && f.progress < 90
              ? { ...f, progress: Math.min(f.progress + 5, 90) }
              : f
          )
        );
      }, 200);

      const response = await fetch(`/api/items/${itemId}/invoices`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const result = await response.json();

      if (result.success && result.success.length > 0) {
        const invoice = result.success[0];
        addInvoice(itemId, invoice);
        updateFileStatus(uploadFile.id, { status: 'success', progress: 100 });
      } else if (result.failed && result.failed.length > 0) {
        throw new Error(result.failed[0].error);
      }
    } catch (error) {
      updateFileStatus(uploadFile.id, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : '上传失败',
      });
    }
  };

  /**
   * 处理文件上传
   * @param fileId - 可选的特定文件 ID，如果不提供则上传所有待上传文件
   * 
   * 支持单个文件上传和批量上传
   */
  const handleUpload = async (fileId?: string) => {
    const filesToUpload = fileId
      ? uploadFiles.filter(f => f.id === fileId)
      : uploadFiles.filter(f => f.status === 'pending');

    for (const file of filesToUpload) {
      await uploadFile(file);
    }
  };

  /**
   * 移除文件
   * @param fileId - 待移除的文件 ID
   */
  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  /**
   * 继续上传重复文件
   * @param fileId - 待上传的文件 ID
   */
  const continueUpload = (fileId: string) => {
    updateFileStatus(fileId, { status: 'pending', isDuplicate: false });
  };

  /**
   * 处理拖拽进入
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  /**
   * 处理拖拽释放
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  /**
   * 处理点击上传区域
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * 处理文件输入变化
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // 清空输入框，允许重复选择相同文件
    e.target.value = '';
  };

  /**
   * 获取文件图标
   * @param fileType - 文件类型
   * @returns 对应的图标组件
   */
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image size={20} className="text-green-600" />;
    }
    return fileType === 'application/pdf' 
      ? <FileText size={20} className="text-red-600" />
      : <FileText size={20} className="text-gray-600" />;
  };

  /**
   * 获取上传状态的样式和文本
   * @param uploadFile - 上传文件对象
   * @returns 状态信息（颜色和文本）
   */
  const getStatusInfo = (uploadFile: UploadFile) => {
    const statusMap = {
      success: { color: 'text-green-600', text: '上传成功' },
      error: { color: 'text-red-600', text: uploadFile.error || '上传失败' },
      uploading: { color: 'text-blue-600', text: `上传中 ${uploadFile.progress}%` },
      'duplicate-warning': { color: 'text-yellow-600', text: '可能重复' },
      pending: { color: 'text-gray-600', text: '等待上传' },
    };

    return statusMap[uploadFile.status] || statusMap.pending;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload size={20} />
          上传发票
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 上传区域 */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <Upload size={48} className={`mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isDragOver ? '释放文件开始上传' : '点击选择文件或拖拽到此处'}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            支持 PDF、JPEG、PNG 格式，单个文件最大 10MB
          </p>
          <Button variant="outline" type="button">
            选择文件
          </Button>
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_EXTENSIONS}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* 文件列表 */}
        {uploadFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                待上传文件 ({uploadFiles.length})
              </h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleUpload()}
                  disabled={!uploadFiles.some(f => f.status === 'pending')}
                >
                  全部上传
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUploadFiles([])}
                >
                  清空列表
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {uploadFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {/* 文件图标 */}
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadFile.file.type)}
                  </div>

                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {/* 状态和进度 */}
                  <div className="flex-1 min-w-0">
                    {uploadFile.status === 'uploading' ? (
                      <>
                        <p className="text-sm text-blue-600">
                          上传中 {uploadFile.progress}%
                        </p>
                        <Progress value={uploadFile.progress} className="mt-1" />
                      </>
                    ) : (
                      <p className={`text-sm ${getStatusInfo(uploadFile).color}`}>
                        {getStatusInfo(uploadFile).text}
                      </p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1">
                    {uploadFile.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpload(uploadFile.id)}
                      >
                        上传
                      </Button>
                    )}
                    {uploadFile.status === 'success' && (
                      <CheckCircle size={20} className="text-green-600" />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 重复文件警告 */}
        {uploadFiles.some(f => f.status === 'duplicate-warning') && (
          <div className="space-y-2">
            {uploadFiles
              .filter(f => f.status === 'duplicate-warning')
              .map((uploadFile) => (
                <Alert key={uploadFile.id} variant="warning">
                  <AlertTriangle size={16} />
                  <AlertTitle>检测到可能重复的文件</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      文件 "{uploadFile.file.name}" 可能与已上传的发票重复：
                    </p>
                    {uploadFile.duplicateInvoice && (
                      <p className="text-sm mb-3">
                        已存在文件：{uploadFile.duplicateInvoice.fileName}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => continueUpload(uploadFile.id)}
                      >
                        继续上传
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        取消上传
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}