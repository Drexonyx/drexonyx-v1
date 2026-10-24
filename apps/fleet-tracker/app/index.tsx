import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { isActivated } from '../src/services/license';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Timeout fallback: if SecureStore hangs on MIUI, default to activate screen after 5s
    const fallback = setTimeout(() => {
      router.replace('/activate');
    }, 5000);

    isActivated()
      .then(result => {
        clearTimeout(fallback);
        router.replace(result ? '/(tabs)/map' : '/activate');
      })
      .catch(() => {
        clearTimeout(fallback);
        router.replace('/activate');
      });

    return () => clearTimeout(fallback);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0c' }}>
      <ActivityIndicator color="#C8980A" size="large" />
      <Text style={{ color: '#606070', marginTop: 16, fontSize: 13 }}>Fleet Tracker</Text>
    </View>
  );
}
