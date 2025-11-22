import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.masoniclodge.mobile',
  appName: 'MasonicLodge',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav'
    },
    App: {
      // Deep linking support for invitation codes
      appUrlOpen: true
    }
  },
  ios: {
    scheme: 'MasonicLodge'
  }
}

export default config
