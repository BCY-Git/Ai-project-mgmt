import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 注册Element Plus
app.use(ElementPlus, {
  locale: zhCn,
})

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册Pinia
app.use(createPinia())

// 注册路由
app.use(router)

app.mount('#app')
