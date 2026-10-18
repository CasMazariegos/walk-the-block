import { useEffect, useState } from 'react'

export function Thumb({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  if (!url) return <div className={className} />
  return <img src={url} alt={alt} className={className} />
}
