import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import DownloadButton from '../components/DownloadButton.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('DownloadButton', DownloadButton)
  }
}
