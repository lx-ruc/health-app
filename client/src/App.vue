<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { doLogin } from './api'
import { hasCompletedOnboarding } from './utils/storage'

onLaunch(async () => {
  try {
    await doLogin()
    if (!hasCompletedOnboarding()) {
      uni.reLaunch({ url: '/pages/onboarding/index' })
    }
  } catch (err) {
    console.error('Login failed:', err)
  }
})
</script>

<style>
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
}
</style>
