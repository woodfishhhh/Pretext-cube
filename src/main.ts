import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)

// 开发环境下启用 Vue DevTools
if (!import.meta.env.PROD) {
  import('@vue/devtools').then((devtools) => {
    devtools.setupDevToolsPlugin({
      id: 'pretext',
      label: 'Pretext',
      packageName: 'pretext',
      homepage: 'https://github.com/woodfish/pretext',
      logo: undefined,
      componentStateTypes: [],
    } as any, app as any)
  }).catch(() => {
    console.log('Vue DevTools plugin setup skipped')
  })
}

app.mount('#app')
