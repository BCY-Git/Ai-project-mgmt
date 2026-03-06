import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ForbiddenPage(): React.JSX.Element {
  return (
    <div className="simple-center-page">
      <Card className="simple-card">
        <CardHeader>
          <CardTitle>403 无访问权限</CardTitle>
          <CardDescription>你当前账号没有访问该页面的权限。</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="button-link" to="/dashboard">返回仪表盘</Link>
        </CardContent>
      </Card>
    </div>
  )
}
