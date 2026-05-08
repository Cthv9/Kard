import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { QRCodeSVG } from 'qrcode.react'

interface BarcodeDisplayProps {
  value: string
  format?: string
  height?: number
  width?: number
  displayValue?: boolean
  className?: string
}

export function BarcodeDisplay({
  value,
  format = 'CODE128',
  height = 80,
  width = 2,
  displayValue = false,
  className,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!svgRef.current || !value) return
    setError(null)
    try {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        displayValue,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 10,
        fontSize: 14,
        fontOptions: 'bold',
      })
    } catch {
      setError('Formato codice non valido')
    }
  }, [value, format, width, height, displayValue])

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 text-red-500 text-xs ${className}`}>
        {error}
      </div>
    )
  }

  return <svg ref={svgRef} className={className} />
}

interface QRDisplayProps {
  value: string
  size?: number
  className?: string
}

export function QRDisplay({ value, size = 200, className }: QRDisplayProps) {
  return (
    <div className={className}>
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
      />
    </div>
  )
}
