import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { isActivated } from '../src/services/license';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    isActivated().then(result => {
      setActivated(result);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0c' }}>
        <ActivityIndicator color="#C8980A" size="large" />
      </View>
    );
  }

  return <Redirect href={activated ? '/(tabs)/map' : '/activate'} />;
}
