import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ label, active }: { label: string; active: boolean }) {
  const icons: Record<string, string> = {
    map: '🗺️',
    vehicles: '🚗',
    reports: '📊',
  };
  return <Text style={{ fontSize: 20, opacity: active ? 1 : 0.45 }}>{icons[label] ?? '?'}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0c' },
        headerTintColor: '#f0f0f4',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        headerRight: () => null,
        tabBarStyle: {
          backgroundColor: '#0d0d12',
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: 70,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#C8980A',
        tabBarInactiveTintColor: '#505060',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Live Map',
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon label="map" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Fleet',
          tabBarLabel: 'Fleet',
          tabBarIcon: ({ focused }) => <TabIcon label="vehicles" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Mileage',
          tabBarLabel: 'Reports',
          tabBarIcon: ({ focused }) => <TabIcon label="reports" active={focused} />,
        }}
      />
    </Tabs>
  );
}
