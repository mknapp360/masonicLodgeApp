import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabase'

export const initializePushNotifications = async () => {
  // Check if we're on mobile
  if (!('PushNotifications' in window)) {
    console.log('Push notifications not available on web');
    return;
  }

  try {
    // Request permission
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();
      
      // Listen for registration token
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        await savePushToken(token.value);
      });

      // Listen for incoming push notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received: ', notification);
      });

      // Handle notification tap
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed', notification);
      });
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

const savePushToken = async (token: string) => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Update member record with push token
    await supabase
      .from('members')
      .update({ push_token: token })
      .eq('auth_user_id', user.id);
  }
};