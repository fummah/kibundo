import { useState, useRef, useEffect } from 'react';
import { Modal, Button, Slider } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';

const ImageCropModal = ({ visible, imageSrc, onCancel, onCropComplete, aspect = 1 }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (visible && imageSrc) {
      // Reset state when modal opens
      setScale(1);
      setPosition({ x: 0, y: 0 });
      loadImage();
    }
  }, [visible, imageSrc]);

  const loadImage = () => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.src = imageSrc;
  };

  const drawCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Set canvas size
    const containerWidth = containerRef.current?.clientWidth || 600;
    const containerHeight = 400;
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scaled dimensions
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Center the image with position offset
    const x = (canvas.width - scaledWidth) / 2 + position.x;
    const y = (canvas.height - scaledHeight) / 2 + position.y;

    // Draw image
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw crop overlay
    const cropSize = Math.min(canvas.width, canvas.height) * 0.7;
    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize) / 2;

    // Darken outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(cropX, cropY, cropSize, cropSize);

    // Draw crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    if (aspect === 1) {
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, cropSize / 2, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeRect(cropX, cropY, cropSize, cropSize);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [scale, position]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleCropConfirm = async () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;

    // Create cropping canvas
    const cropCanvas = document.createElement('canvas');
    const cropSize = 300; // Output size
    cropCanvas.width = cropSize;
    cropCanvas.height = cropSize;
    const cropCtx = cropCanvas.getContext('2d');

    // Calculate crop area from main canvas
    const canvasCropSize = Math.min(canvas.width, canvas.height) * 0.7;
    const canvasCropX = (canvas.width - canvasCropSize) / 2;
    const canvasCropY = (canvas.height - canvasCropSize) / 2;

    // Calculate image position on canvas
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const imgX = (canvas.width - scaledWidth) / 2 + position.x;
    const imgY = (canvas.height - scaledHeight) / 2 + position.y;

    // Calculate source coordinates
    const srcX = (canvasCropX - imgX) / scale;
    const srcY = (canvasCropY - imgY) / scale;
    const srcSize = canvasCropSize / scale;

    // Draw cropped image
    cropCtx.drawImage(
      img,
      Math.max(0, srcX),
      Math.max(0, srcY),
      Math.min(img.width, srcSize),
      Math.min(img.height, srcSize),
      0,
      0,
      cropSize,
      cropSize
    );

    // Convert to blob
    cropCanvas.toBlob((blob) => {
      onCropComplete(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <Modal
      title="Crop Profile Picture"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleCropConfirm}>
          Apply Crop
        </Button>,
      ]}
      width={700}
    >
      <div className="space-y-4">
        <div 
          ref={containerRef}
          className="relative w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: '400px' }}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <ZoomOutOutlined className="text-gray-500" />
            <Slider
              min={0.5}
              max={3}
              step={0.1}
              value={scale}
              onChange={setScale}
              className="flex-1"
            />
            <ZoomInOutlined className="text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Use the slider to zoom and drag the image to reposition
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ImageCropModal;

