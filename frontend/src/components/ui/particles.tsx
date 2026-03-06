import * as React from 'react'
import { cn } from '@/lib/utils'

type Particle = {
  x: number
  y: number
  translateX: number
  translateY: number
  size: number
  alpha: number
  targetAlpha: number
  velocityX: number
  velocityY: number
  magnetism: number
}

type Pointer = {
  x: number
  y: number
}

type ParticlesProps = React.HTMLAttributes<HTMLDivElement> & {
  quantity?: number
  staticity?: number
  ease?: number
  size?: number
  color?: string
  vx?: number
  vy?: number
  refresh?: boolean
}

export function Particles({
  className,
  quantity = 120,
  staticity = 45,
  ease = 70,
  size = 0.45,
  color = '#f8fafc',
  vx = 0.45,
  vy = 0.45,
  refresh = false,
  ...props
}: ParticlesProps): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const contextRef = React.useRef<CanvasRenderingContext2D | null>(null)
  const particlesRef = React.useRef<Particle[]>([])
  const pointerRef = React.useRef<Pointer | null>(null)
  const animationRef = React.useRef<number | null>(null)
  const boundsRef = React.useRef({ width: 0, height: 0 })

  const initParticles = React.useCallback(() => {
    const { width, height } = boundsRef.current
    const particles: Particle[] = []

    for (let index = 0; index < quantity; index += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        translateX: 0,
        translateY: 0,
        size: Math.random() * 1.6 + size,
        alpha: 0,
        targetAlpha: Math.random() * 0.6 + 0.1,
        velocityX: (Math.random() - 0.5) * vx,
        velocityY: (Math.random() - 0.5) * vy,
        magnetism: 0.1 + Math.random() * 4,
      })
    }

    particlesRef.current = particles
  }, [quantity, size, vx, vy])

  const setupCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    if (!width || !height) return null

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    if (!context) return null

    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    boundsRef.current = { width, height }
    return context
  }, [])

  const render = React.useCallback(() => {
    const context = contextRef.current
    const { width, height } = boundsRef.current

    if (context && width > 0 && height > 0) {
      context.clearRect(0, 0, width, height)

      const pointer = pointerRef.current
      particlesRef.current.forEach((particle) => {
        particle.x += particle.velocityX
        particle.y += particle.velocityY

        if (particle.x < 0 || particle.x > width) {
          particle.velocityX *= -1
        }
        if (particle.y < 0 || particle.y > height) {
          particle.velocityY *= -1
        }

        particle.x = Math.min(Math.max(particle.x, 0), width)
        particle.y = Math.min(Math.max(particle.y, 0), height)

        if (pointer) {
          const offsetX = pointer.x - particle.x
          const offsetY = pointer.y - particle.y
          particle.translateX += ((offsetX / staticity) * particle.magnetism - particle.translateX) / ease
          particle.translateY += ((offsetY / staticity) * particle.magnetism - particle.translateY) / ease
        } else {
          particle.translateX += (0 - particle.translateX) / (ease * 0.9)
          particle.translateY += (0 - particle.translateY) / (ease * 0.9)
        }

        particle.alpha += (particle.targetAlpha - particle.alpha) * 0.02
        if (Math.random() > 0.985) {
          particle.targetAlpha = Math.random() * 0.6 + 0.1
        }

        context.save()
        context.translate(particle.translateX, particle.translateY)
        context.globalAlpha = particle.alpha
        context.fillStyle = color
        context.beginPath()
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        context.fill()
        context.restore()
      })
    }

    animationRef.current = window.requestAnimationFrame(render)
  }, [color, ease, staticity])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const syncCanvas = () => {
      const context = setupCanvas()
      if (!context) {
        contextRef.current = null
        return
      }
      contextRef.current = context
      initParticles()
    }

    const updatePointer = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        pointerRef.current = null
        return
      }

      pointerRef.current = { x, y }
    }

    const clearPointer = () => {
      pointerRef.current = null
    }

    const onResize = () => {
      syncCanvas()
    }

    syncCanvas()
    let observer: ResizeObserver | null = null
    if (typeof window.ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => syncCanvas())
      observer.observe(canvas)
    }
    animationRef.current = window.requestAnimationFrame(render)
    window.addEventListener('mousemove', updatePointer)
    window.addEventListener('mouseout', clearPointer)
    window.addEventListener('resize', onResize)

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      window.removeEventListener('mousemove', updatePointer)
      window.removeEventListener('mouseout', clearPointer)
      window.removeEventListener('resize', onResize)
      observer?.disconnect()
    }
  }, [initParticles, refresh, render, setupCanvas])

  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} aria-hidden="true" {...props}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  )
}
