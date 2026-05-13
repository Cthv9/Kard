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

  // JsBarcode mutates the SVG element imperatively (it needs a real DOM node
  // and the format-specific validators throw on bad inputs), so the work
  // belongs in an effect. setError here only flips the rendered branch and
  // does not cascade further updates, so the rule's performance concern is
  // not applicable to this call site.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!svgRef.current || !value) return
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
      setError(null)
    } catch {
      setError('Formato codice non valido')
    }
  }, [value, format, width, height, displayValue])
  /* eslint-enable react-hooks/set-state-in-effect */

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
