import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Quill from 'quill';
import Editor from './Editor';
import { authorizedRequest, authorizedUploadRequest } from './apiClient';

const Delta = Quill.import('delta');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp';
const PHOTO_BASE_URL = 'https://innoway-photos.s3.ap-northeast-1.amazonaws.com/articles';

const normalizeImageRanks = (imageList) => imageList.map((image, index) => ({
  ...image,
  rank: index + 1,
}));

const isBlobPreview = (preview) => typeof preview === 'string' && preview.startsWith('blob:');

const getDateInputValue = (dateLike = new Date()) => {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const dateParts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = dateParts.find((part) => part.type === 'year')?.value;
  const month = dateParts.find((part) => part.type === 'month')?.value;
  const day = dateParts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return '';
  }

  return `${year}-${month}-${day}`;
};

const ArticleEditor = () => {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const quillRef = useRef();
  const imageInputRef = useRef();
  const isNew = articleId === 'new';
  const [title, setTitle] = useState('');
  const [publishedAt, setPublishedAt] = useState(() => getDateInputValue());
  const [initialDelta, setInitialDelta] = useState(() => new Delta());
  const [isLoadingArticle, setIsLoadingArticle] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [images, setImages] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [currentUploadName, setCurrentUploadName] = useState('');
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');
  const redirectTimeoutRef = useRef(null);
  const objectUrlRegistryRef = useRef(new Set());

  const editorKey = useMemo(() => {
    return isNew ? 'editor-new' : `editor-${articleId}-${JSON.stringify(initialDelta.ops || [])}`;
  }, [articleId, initialDelta, isNew]);

  useEffect(() => {
    if (isNew) {
      setTitle('');
      setPublishedAt(getDateInputValue());
      setInitialDelta(new Delta());
      setImages((currentImages) => {
        currentImages.forEach((image) => {
          if (isBlobPreview(image.preview)) {
            URL.revokeObjectURL(image.preview);
            objectUrlRegistryRef.current.delete(image.preview);
          }
        });
        return [];
      });
      setIsLoadingArticle(false);
      return;
    }

    const fetchArticle = async () => {
      try {
        setIsLoadingArticle(true);
        setSubmitError('');

        const data = await authorizedRequest(`/article?articleId=${encodeURIComponent(articleId)}`);
        setTitle(data?.title || '');
        setPublishedAt(data?.publishedAt ? getDateInputValue(data.publishedAt) : getDateInputValue());

        const parsedOps = data?.content ? JSON.parse(data.content) : [];
        const safeOps = Array.isArray(parsedOps) ? parsedOps : [];
        setInitialDelta(new Delta(safeOps));
   
        const fetchedImages = Array.isArray(data?.photos)
          ? normalizeImageRanks(
            [...data.photos]
              .sort((firstPhoto, secondPhoto) => (firstPhoto?.rank || 0) - (secondPhoto?.rank || 0))
              .map((photo) => ({
                id: photo.fileName,
                file: null,
                preview: `${PHOTO_BASE_URL}/${encodeURIComponent(articleId)}/${encodeURIComponent(photo.fileName)}`,
                name: photo.fileName,
                rank: photo.rank,
                mimeType: photo.mimeType,
                fetched: true,
              }))
          )
          : [];

        setImages((currentImages) => {
          currentImages.forEach((image) => {
            if (isBlobPreview(image.preview)) {
              URL.revokeObjectURL(image.preview);
              objectUrlRegistryRef.current.delete(image.preview);
            }
          });

          return fetchedImages;
        });
       } catch (error) {
         setSubmitError(error.message || '加载文章失败，请稍后重试');
       } finally {
         setIsLoadingArticle(false);
       }
     };

    fetchArticle();
  }, [articleId, isNew]);

  useEffect(() => {
    const objectUrls = objectUrlRegistryRef.current;

    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }

      objectUrls.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
      objectUrls.clear();
    };
  }, []);

  const generateArticleId = (datePrefix) => {
    const now = new Date();
    const epochSeconds = Math.floor(now.getTime() / 1000).toString();
    const suffix = epochSeconds.slice(-6).padStart(6, '0');

    return `${datePrefix}-${suffix}`;
  };

  const uploadPhotoRequest = async (formData, onProgress) => {
    return authorizedUploadRequest('/photo', formData, onProgress);
  };

  const handleSubmit = async (status) => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setSubmitError('请输入文章标题');
      return;
    }

    const publishedAtToUse = publishedAt;

    if (!publishedAtToUse || !/^\d{4}-\d{2}-\d{2}$/.test(publishedAtToUse)) {
      setSubmitError('请选择有效的发布日期');
      return;
    }

    const delta = quillRef.current?.getContents();
    const content = JSON.stringify(delta?.ops || []);
    const articleIdToUse = generateArticleId(publishedAtToUse);
    let uploadedPhotos = [];

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSubmitSuccessMessage('');

      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }

      if (images.length > 0) {
        uploadedPhotos = await uploadImages(articleIdToUse);
      }

      await authorizedRequest('/article', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: articleIdToUse,
          oldArticleId: isNew ? undefined : articleId,
          title: trimmedTitle,
          content,
          status,
          publishedAt: publishedAtToUse,
          photos: uploadedPhotos,
        }),
      });

      setSubmitSuccessMessage(status === 'PUBLISHED' ? '文章发布成功' : '草稿保存成功');
      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate('/admin');
      }, 5000);
    } catch (error) {
      setSubmitError(error.message || '保存失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
      setIsUploadingPhotos(false);
      setPhotoUploadProgress(0);
      setCurrentUploadName('');
    }
  };

  const handleFileSelect = (files) => {
    const selectedFiles = Array.from(files || []);
    const validFiles = selectedFiles.filter((file) => ALLOWED_IMAGE_TYPES.includes(file.type));

    if (validFiles.length !== selectedFiles.length) {
      setSubmitError('只支持 JPG、PNG、GIF、WEBP 图片');
    } else {
      setSubmitError('');
    }

    if (validFiles.length === 0) {
      return;
    }

    const newImages = validFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrlRegistryRef.current.add(previewUrl);

      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: previewUrl,
        name: file.name,
        mimeType: file.type,
        fetched: false,
      };
    });
    setImages((currentImages) => normalizeImageRanks([...currentImages, ...newImages]));
  };

  const openImagePicker = () => {
    imageInputRef.current?.click();
  };

  const handleImageInputChange = (event) => {
    handleFileSelect(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageDragStart = (e, draggedIndex) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('draggedIndex', draggedIndex);
  };

  const handleImageDragOver = (e, hoverIndex) => {
    e.preventDefault();
    setDragOverIndex(hoverIndex);
  };

  const handleImageDrop = (e, dropIndex) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('draggedIndex'), 10);
    
    if (draggedIndex !== dropIndex) {
      const newImages = [...images];
      const draggedItem = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(dropIndex, 0, draggedItem);
      setImages(normalizeImageRanks(newImages));
    }
    setDragOverIndex(null);
  };

  const handleDeleteImage = (id) => {
    setImages((currentImages) => {
      const targetImage = currentImages.find((image) => image.id === id);

      if (targetImage && isBlobPreview(targetImage.preview)) {
        URL.revokeObjectURL(targetImage.preview);
        objectUrlRegistryRef.current.delete(targetImage.preview);
      }

      return normalizeImageRanks(currentImages.filter((img) => img.id !== id));
    });
  };

  const uploadImages = async (articleIdToUse) => {
    if (images.length === 0) {
      return [];
    }

    const rankedImages = normalizeImageRanks(images);
    const newImages = rankedImages.filter((img) => img.file !== null && !img.fetched);
    const fetchedImages = rankedImages.filter((img) => img.fetched);
    const totalBytes = newImages.reduce((sum, image) => sum + (image.file.size || 0), 0);
    let uploadedBytes = 0;
    const uploadedPhotos = [];

    setIsUploadingPhotos(true);
    setPhotoUploadProgress(0);

    fetchedImages.forEach((image) => {
      uploadedPhotos.push({
        rank: image.rank,
        fileName: image.name,
        mimeType: image.mimeType,
      });
    });

    for (const image of newImages) {
      try {
        setCurrentUploadName(image.name);
        const uploadedBytesAtStart = uploadedBytes;

        const formData = new FormData();
        formData.append('articleId', articleIdToUse);
        formData.append('fileName', image.name);
        formData.append('file', image.file);
        formData.append('mimeType', image.file.type);

        const uploadedPhoto = await uploadPhotoRequest(formData, (loadedBytes, currentTotalBytes) => {
          if (!totalBytes) {
            return;
          }

          const normalizedLoadedBytes = currentTotalBytes > 0
            ? Math.min(loadedBytes, image.file.size || currentTotalBytes)
            : loadedBytes;
          const overallLoadedBytes = uploadedBytesAtStart + normalizedLoadedBytes;
          const progress = Math.min(100, Math.round((overallLoadedBytes / totalBytes) * 100));
          setPhotoUploadProgress(progress);
        });

        uploadedPhotos.push({
          rank: image.rank,
          fileName: uploadedPhoto?.fileName || image.name,
          mimeType: uploadedPhoto?.mimeType || image.file.type || '',
        });

        uploadedBytes += image.file.size || 0;
        setPhotoUploadProgress(Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)));
      } catch (error) {
        console.error(`Failed to upload image ${image.name}:`, error);
        throw new Error(`图片上传失败：${image.name}`);
      }
    }

    setPhotoUploadProgress(100);
    return uploadedPhotos;
  };

  return (
    <div className="editor-page">
      {submitSuccessMessage && (
        <div className="success-alert-overlay" role="presentation">
          <div
            className="success-alert"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="article-editor-success-title"
            aria-describedby="article-editor-success-description"
          >
            <h2 id="article-editor-success-title" className="success-alert-title">
              {submitSuccessMessage}
            </h2>
            <p className="success-alert-note">5 秒后将返回文章列表</p>
          </div>
        </div>
      )}

      <header className="detail-header">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/admin')}
        >
          ← 返回
        </button>
        <h1 className="detail-title" style={{ margin: '0 0 0 16px' }}>
          {isNew ? '添加文章' : '编辑文章'}
        </h1>
      </header>

      <main className="editor-main">
        <section className="editor-toolbar editor-toolbar-group">
          <div className="editor-toolbar-row">
            <label htmlFor="article-title" className="editor-label">
              标题
            </label>
            <input
              id="article-title"
              type="text"
              className="editor-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="请输入文章标题"
            />
          </div>
          <div className="editor-toolbar-row">
            <label htmlFor="article-published-at" className="editor-label">
              发布日期
            </label>
            <input
              id="article-published-at"
              type="date"
              className="editor-title-input"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
              required
              aria-required="true"
            />
          </div>
        </section>

        {!isLoadingArticle && (
          <div className="editor-content">
            <Editor
              key={editorKey}
              ref={quillRef}
              defaultValue={initialDelta}
            />
          </div>
        )}

        {!isLoadingArticle && (
          <section className="image-gallery-section">
            <label className="editor-label">图片</label>
            
            <div
              className="image-drop-zone"
              role="button"
              tabIndex={0}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={openImagePicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openImagePicker();
                }
              }}
            >
              <div className="drop-content">
                <p>拖拽图片到此处，或点击选择文件</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_IMAGE_ACCEPT}
                  onChange={handleImageInputChange}
                  style={{ display: 'none' }}
                  id="image-input"
                />
                <label className="btn btn-secondary">
                  选择图片
                </label>
              </div>
            </div>

            {images.length > 0 && (
              <div className="image-gallery">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className={`image-item ${dragOverIndex === index ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, index)}
                    onDragOver={(e) => handleImageDragOver(e, index)}
                    onDrop={(e) => handleImageDrop(e, index)}
                    onDragLeave={() => setDragOverIndex(null)}
                  >
                    <img src={image.preview} alt={image.name} className="image-thumbnail" />
                    <div className="image-actions">
                      <span className="image-name">{image.name}</span>
                      <button
                        type="button"
                        className="btn-remove-image"
                        onClick={() => handleDeleteImage(image.id)}
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isUploadingPhotos && (
              <div className="photo-upload-progress">
                <div className="photo-upload-progress-header">
                  <span>图片上传中</span>
                  <span>{photoUploadProgress}%</span>
                </div>
                <div className="photo-upload-progress-track" aria-hidden="true">
                  <div
                    className="photo-upload-progress-fill"
                    style={{ width: `${photoUploadProgress}%` }}
                  />
                </div>
                <p className="photo-upload-progress-text">
                  {currentUploadName ? `正在上传 ${currentUploadName}` : '正在上传图片'}
                </p>
              </div>
            )}
          </section>
        )}

        {isLoadingArticle && <p className="page-loading">Loading article...</p>}

        <div className="editor-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isSubmitting || isLoadingArticle || !publishedAt}
          >
            保存草稿
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSubmit('PUBLISHED')}
            disabled={isSubmitting || isLoadingArticle || !publishedAt}
          >
            发布
          </button>
        </div>

        {submitError && <p className="error-text editor-error">{submitError}</p>}
      </main>
    </div>
  );
};

export default ArticleEditor;
