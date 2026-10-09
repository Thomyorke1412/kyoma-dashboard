export function drawCrop(context, image, rect) {
  context.clearRect(rect.dx, rect.dy, rect.width, rect.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.width, rect.height)
}

export function renderCropToCanvas(canvas, image, rect) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot draw the avatar crop.')
  canvas.width = rect.width
  canvas.height = rect.height
  drawCrop(context, image, rect)
  return canvas
}

export function renderCropToBlob(image, rect, type = 'image/png') {
  return new Promise((resolve, reject) => {
    let canvas
    try {
      canvas = renderCropToCanvas(document.createElement('canvas'), image, rect)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('The avatar could not be encoded.'))
      }, type)
    } catch (error) {
      reject(error instanceof Error ? error : new Error('The avatar could not be drawn.'))
    }
  })
}
