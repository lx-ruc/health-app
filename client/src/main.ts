import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  // 调试：Error 对象过日志桥会序列化成 {}，这里打明文定位真实错误
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[Vue errorHandler]', String(err), '|', info)
  }
  return { app }
}
