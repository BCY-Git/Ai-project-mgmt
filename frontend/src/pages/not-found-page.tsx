import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="simple-center-page">
      <Card className="simple-card">
        <CardHeader>
          <CardTitle>404 页面不存在</CardTitle>
          <CardDescription>地址可能输入错误，或者页面已迁移。</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="button-link" to="/dashboard">回到首页</Link>
        </CardContent>
      </Card>
    </div>
  )
}
