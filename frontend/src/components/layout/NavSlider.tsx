'use client'
import { motion } from 'framer-motion'

type NavSliderProps = {
  enabled: boolean
  top: number
  height: number
  className?: string
  style?: React.CSSProperties
  backgroundColor?: string
  borderRadius?: number
  /** 按压时临时改变高度（jelly 收缩效果） */
  pressedHeight?: number | null
}

export function NavSlider({ enabled, top, height, className = '', style, backgroundColor, borderRadius, pressedHeight = null }: NavSliderProps) {
  const animatedHeight = pressedHeight ?? height
  if (!enabled) {
    return (
      <div
        className={`absolute ${className}`}
        style={{
          top,
          height: animatedHeight,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundColor,
          borderRadius,
          transition: 'top 0.2s ease, height 0.2s ease',
          ...style,
        }}
      />
    )
  }
  return (
    <motion.div
      className={`absolute ${className}`}
      style={{
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor,
        borderRadius,
        ...style,
      }}
      animate={{ top, height: animatedHeight }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    />
  )
}