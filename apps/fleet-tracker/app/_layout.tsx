import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { initService } from '../src/services/wialon';
import { isActivated } from '../src/services/license';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5_000 },
  },
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    initService();
    isActivated().then(activated => {
      if (!activated) router.replace('/activate');
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0a0a0c' },
            headerTintColor: '#f0f0f4',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#0a0a0c' },
          }}
        >
          <Stack.Screen name="activate" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="vehicle/[id]"
            options={{ title: 'Vehicle Details', presentation: 'card' }}
          />
          <Stack.Screen
            name="history/[id]"
            options={{ title: 'Trip History', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: 'Settings', presentation: 'modal' }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
