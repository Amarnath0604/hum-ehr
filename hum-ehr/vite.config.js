import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/ehr/",
  plugins: [react()],
  build: {
    // Split large third-party libraries into their own cacheable chunks so the
    // main entry stays small and route/section lazy chunks don't re-bundle vendors.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('primereact') || id.includes('primeicons') || id.includes('primeflex')) return 'vendor-prime'
          if (id.includes('sweetalert2')) return 'vendor-sweetalert'
          if (id.includes('@tanstack')) return 'vendor-tanstack'
          if (id.includes('react-select') || id.includes('flatpickr') || id.includes('react-hook-form') || id.includes('zod')) return 'vendor-forms'
          if (id.includes('@reduxjs') || id.includes('react-redux') || id.includes('/redux/')) return 'vendor-redux'
          if (id.includes('@bugsnag')) return 'vendor-bugsnag'
          if (id.includes('dayjs')) return 'vendor-dayjs'
          if (id.includes('bootstrap')) return 'vendor-bootstrap'
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
})
