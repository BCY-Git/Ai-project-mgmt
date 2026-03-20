declare module '@/components/OrbitImages' {
  import type * as React from 'react'

  export type OrbitImagesProps = {
    images?: string[]
    altPrefix?: string
    shape?: 'ellipse' | 'circle' | 'square' | 'rectangle' | 'triangle' | 'star' | 'heart' | 'infinity' | 'wave' | 'custom'
    customPath?: string
    baseWidth?: number
    radiusX?: number
    radiusY?: number
    radius?: number
    starPoints?: number
    starInnerRatio?: number
    rotation?: number
    duration?: number
    itemSize?: number
    direction?: 'normal' | 'reverse'
    fill?: boolean
    width?: number | string
    height?: number | string
    className?: string
    showPath?: boolean
    pathColor?: string
    pathWidth?: number
    easing?: string
    paused?: boolean
    centerContent?: React.ReactNode
    responsive?: boolean
  }

  const OrbitImages: (props: OrbitImagesProps) => React.JSX.Element
  export default OrbitImages
}
