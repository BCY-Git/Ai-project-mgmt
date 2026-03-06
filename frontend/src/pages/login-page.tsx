import * as React from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { Particles } from "@/components/ui/particles"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/toast"

export function LoginPage(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, accessToken } = useAuth()
  const { push } = useToast()
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (accessToken) {
      navigate("/dashboard", { replace: true })
    }
  }, [accessToken, navigate])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    if (!email || !password) {
      push("请完善表单字段", "error")
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      push("登录成功", "success")

      const redirect = searchParams.get("redirect")
      navigate(redirect ? decodeURIComponent(redirect) : "/dashboard", { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败"
      push(message, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-slate-950">
      <Particles className="absolute inset-0" quantity={140} staticity={55} ease={90} size={0.5} color="#e2e8f0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.2),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(15,23,42,0.45),transparent_45%)]" />

      <div className="relative z-10 flex min-h-svh items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <a href="#" className="flex items-center gap-2 font-medium">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-4" />
              </div>
              AI Project Mgmt
            </a>
          </div>

          <LoginForm onFormSubmit={onSubmit} loading={loading} />
        </div>
      </div>
    </div>
  )
}
