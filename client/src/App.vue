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
    console.warn('Login failed, running in offline mode:', err)
  }
})
</script>

<style>
page {
  background-color: #FAF7F2;
  color: #2D2A26;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Global press feedback for tappable elements */
.tap-effect {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.tap-effect:active {
  transform: scale(0.97);
  opacity: 0.85;
}

/* Card entrance animation */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(24rpx); }
  to { opacity: 1; transform: translateY(0); }
}
.anim-card {
  animation: fadeSlideUp 0.35s ease-out both;
}
.anim-card:nth-child(1) { animation-delay: 0.03s; }
.anim-card:nth-child(2) { animation-delay: 0.08s; }
.anim-card:nth-child(3) { animation-delay: 0.13s; }
.anim-card:nth-child(4) { animation-delay: 0.18s; }
.anim-card:nth-child(5) { animation-delay: 0.23s; }
.anim-card:nth-child(6) { animation-delay: 0.28s; }

/* Smooth transitions for interactive elements */
.interactive {
  transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease;
}
.interactive:active {
  transform: scale(0.97);
  box-shadow: 0 1rpx 4rpx rgba(45,42,38,0.08);
}
</style>
