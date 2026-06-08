import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getUserProfile, setUserProfile, hasCompletedOnboarding, getOnboardingStep, setOnboardingStep } from '../utils/storage'
import { get, put } from '../api'

export const useUserStore = defineStore('user', () => {
  const profile = ref<any>(getUserProfile() || {})
  const isOnboarded = ref(hasCompletedOnboarding())
  const onboardingStep = ref(getOnboardingStep())

  function updateLocalProfile(data: any) {
    profile.value = { ...profile.value, ...data }
    setUserProfile(profile.value)
  }

  function setStep(step: number) {
    onboardingStep.value = step
    setOnboardingStep(step)
  }

  function completeOnboarding() {
    isOnboarded.value = true
    onboardingStep.value = -1
    setOnboardingStep(-1)
  }

  async function fetchProfile() {
    try {
      const data = await get('/user/profile')
      profile.value = data
      setUserProfile(data)
    } catch {}
  }

  async function saveProfile(data: any) {
    await put('/user/profile', data)
    updateLocalProfile(data)
  }

  return { profile, isOnboarded, onboardingStep, updateLocalProfile, setStep, completeOnboarding, fetchProfile, saveProfile }
})
