import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getSession } from '../src/services/auth';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed]     = useState(false);

  useEffect(() => {
    getSession()
      .then(s => setAuthed(!!s))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#05050a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#C8980A" size="large" />
      </View>
    );
  }

  return <Redirect href={authed ? '/(tabs)/map' : '/login'} />;
}
