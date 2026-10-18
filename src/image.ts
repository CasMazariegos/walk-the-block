function drawCover(image: HTMLImageElement, maxEdge: number, quality: number): Promise<Blob> {
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (!width || !height) return Promise.reject(new Error('That photo could not be read.'))
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('This browser could not prepare the photo.'))
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('This browser could not prepare the photo.'))),
      'image/jpeg',
      quality,
    )
  })
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error(
          'That photo format did not load. On iPhone, set Camera → Formats → Most Compatible, or choose a JPEG.',
        ),
      )
    }
    image.src = url
  })
}

export async function prepareImage(file: Blob): Promise<{ photo: Blob; thumb: Blob }> {
  const image = await loadImage(file)
  const [photo, thumb] = await Promise.all([drawCover(image, 1280, 0.82), drawCover(image, 480, 0.72)])
  return { photo, thumb }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the photo.'))
    reader.readAsDataURL(blob)
  })
}
