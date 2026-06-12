<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { doLogin } from './api'
import { hasCompletedOnboarding } from './utils/storage'

onLaunch(async () => {
  if (!hasCompletedOnboarding()) {
    uni.reLaunch({ url: '/pages/onboarding/index' })
    return
  }

  try {
    await doLogin()
  } catch (err) {
    console.error('Login failed:', err)
  }
})
</script>

<style>
page {
  background-color: #FAF7F2;
  color: #2D2A26;
}
</style>
